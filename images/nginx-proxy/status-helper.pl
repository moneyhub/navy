#!/usr/bin/env perl
# Local-only helper for the Navy HTTP proxy 502 page.
# Reads container state + recent logs via the mounted Docker socket and
# answers GET /status for the service named in the Host / X-Forwarded-Host
# header (first DNS label). Binds to 127.0.0.1 only — nginx proxies to it.
use strict;
use warnings;
use IO::Socket::INET;

my $DOCKER_SOCK = $ENV{DOCKER_SOCK} || '/tmp/docker.sock';
my $PORT        = $ENV{STATUS_HELPER_PORT} || 9191;
my $LOG_TAIL    = 80;
my $MAX_LOGS    = 32_000;

# Container state is safe to expose; log bodies are not. Logs routinely carry
# tokens and client secrets, and this image is also the base for Navy Manager's
# cloud proxy, where vhosts are reachable from the public internet. Off unless
# the operator opts in — the navy CLI sets this for local proxies.
my $LOGS_ENABLED = ($ENV{NAVY_STATUS_LOGS} || '') =~ /^(1|true|yes)$/i ? 1 : 0;

my $server = IO::Socket::INET->new(
  LocalAddr => '127.0.0.1',
  LocalPort => $PORT,
  Proto     => 'tcp',
  Listen    => 16,
  Reuse     => 1,
) or die "status-helper: bind 127.0.0.1:$PORT failed: $!\n";

$| = 1;
print "status-helper listening on 127.0.0.1:$PORT\n";

while (my $client = $server->accept()) {
  eval { handle_client($client) };
  close $client;
}

sub handle_client {
  my ($client) = @_;
  local $/ = "\r\n";
  my $req = <$client>;
  return unless defined $req;
  my %headers;
  while (my $line = <$client>) {
    last if $line eq "\r\n" || $line eq "\n" || $line eq '';
    if ($line =~ /^([^:]+):\s*(.*?)\s*$/) {
      $headers{lc $1} = $2;
    }
  }

  my ($method, $path) = $req =~ /^(\S+)\s+(\S+)/;
  $method ||= '';
  $path   ||= '';

  if ($method eq 'GET' && $path =~ m{^/status(?:\?|$)}) {
    my $host = $headers{'x-forwarded-host'} || $headers{'host'} || '';
    $host =~ s/:\d+$//;
    my $service = service_from_host($host);
    return respond($client, 400, json_obj(error => 'invalid service name'))
      unless defined $service;
    return respond($client, 200, status_for($service));
  }

  respond($client, 404, json_obj(error => 'not found'));
}

sub service_from_host {
  my ($host) = @_;
  return undef unless $host =~ /^([A-Za-z0-9][A-Za-z0-9_-]*)\./;
  return $1;
}

sub status_for {
  my ($service) = @_;
  my $container = find_container($service);
  unless ($container) {
    return json_obj(
      service => $service,
      found   => \0,
      status  => 'not_found',
      logs    => '',
      logsEnabled => ($LOGS_ENABLED ? \1 : \0),
      hint    => "No container found for compose service \"$service\". Try: navy ps",
    );
  }

  my $id     = $container->{Id};
  my $name   = ($container->{Names} && $container->{Names}[0]) || '';
  $name =~ s{^/}{};
  my $inspect = docker_json("containers/$id/json") || {};
  my $state   = $inspect->{State} || {};
  my $status  = $state->{Status} || ($container->{State} || 'unknown');
  my $logs    = $LOGS_ENABLED ? demux_logs(docker_raw(
    "containers/$id/logs?stdout=1&stderr=1&tail=$LOG_TAIL"
  )) : '';

  # Readiness is probed server-side with a bare TCP connect. The holding page
  # must never re-request the visitor's own URL to test readiness: replaying it
  # carries their cookies and re-triggers side effects (an OIDC /login round
  # trip rewrites the state cookie, breaking the pending /callback).
  my $ready = $state->{Running} ? upstream_accepts_tcp($inspect) : 0;

  if (length($logs) > $MAX_LOGS) {
    $logs = substr($logs, -$MAX_LOGS);
    $logs =~ s/^[^\n]*\n//;
    $logs = "…\n" . $logs;
  }

  return json_obj(
    service    => $service,
    found      => \1,
    container  => $name,
    status     => $status,
    running    => ($state->{Running} ? \1 : \0),
    ready      => ($ready ? \1 : \0),
    logsEnabled => ($LOGS_ENABLED ? \1 : \0),
    exitCode   => defined $state->{ExitCode} ? 0 + $state->{ExitCode} : undef,
    startedAt  => $state->{StartedAt}  || '',
    finishedAt => $state->{FinishedAt} || '',
    error      => $state->{Error}      || '',
    logs       => $logs,
  );
}

# TCP connect only — no HTTP request, so nothing downstream sees a hit.
sub upstream_accepts_tcp {
  my ($inspect) = @_;
  my $net = $inspect->{NetworkSettings} || {};
  my $ip;
  my $networks = $net->{Networks} || {};
  for my $n (sort keys %$networks) {
    my $addr = $networks->{$n}{IPAddress};
    if (defined $addr && length $addr) { $ip = $addr; last }
  }
  $ip ||= $net->{IPAddress};
  return 0 unless defined $ip && length $ip;

  my $port = upstream_port($inspect, $net);
  return 0 unless $port;

  my $sock = IO::Socket::INET->new(
    PeerAddr => $ip,
    PeerPort => $port,
    Proto    => 'tcp',
    Timeout  => 1,
  );
  return 0 unless $sock;
  close $sock;
  return 1;
}

sub upstream_port {
  my ($inspect, $net) = @_;
  my $env = ($inspect->{Config} && $inspect->{Config}{Env}) || [];
  for my $entry (@$env) {
    return $1 if $entry =~ /^VIRTUAL_PORT=(\d+)$/;
  }
  my $ports = $net->{Ports} || {};
  for my $spec (sort keys %$ports) {
    return $1 if $spec =~ m{^(\d+)/tcp$};
  }
  return 80;
}

sub find_container {
  my ($service) = @_;
  # Exact compose service label match — do not accept arbitrary container IDs.
  my $filter = '{"label":["com.docker.compose.service=' . $service . '"]}';
  my $path = 'containers/json?all=1&filters=' . urlenc($filter);
  my $list = docker_json($path);
  return undef unless ref $list eq 'ARRAY' && @$list;
  return $list->[0];
}

sub docker_raw {
  my ($path) = @_;
  return '' unless -S $DOCKER_SOCK;
  my $out = `curl -sS --unix-socket \Q$DOCKER_SOCK\E \Qhttp://localhost/$path\E 2>/dev/null`;
  return defined $out ? $out : '';
}

sub docker_json {
  my ($path) = @_;
  my $raw = docker_raw($path);
  return undef unless length $raw;
  return json_decode($raw);
}

# Docker non-TTY log stream: 8-byte header (stream, 0x00 x3, size BE) + payload.
sub demux_logs {
  my ($raw) = @_;
  return '' unless defined $raw && length $raw;
  my $out = '';
  my $i = 0;
  my $len = length $raw;
  while ($i + 8 <= $len) {
    my ($stream, $size) = unpack('C x3 N', substr($raw, $i, 8));
    $i += 8;
    last if $i + $size > $len;
    $out .= substr($raw, $i, $size);
    $i += $size;
  }
  # Fallback if the stream wasn't multiplexed (TTY containers).
  return $raw if $out eq '' && $raw =~ /[[:print:]\r\n\t]/;
  return $out;
}

sub respond {
  my ($client, $code, $body) = @_;
  my $text = $code == 200 ? 'OK' : $code == 400 ? 'Bad Request' : 'Not Found';
  print $client "HTTP/1.1 $code $text\r\n";
  print $client "Content-Type: application/json\r\n";
  print $client 'Content-Length: ' . length($body) . "\r\n";
  print $client "Cache-Control: no-store\r\n";
  print $client "Connection: close\r\n\r\n";
  print $client $body;
}

sub urlenc {
  my ($s) = @_;
  $s =~ s/([^A-Za-z0-9_.~-])/sprintf('%%%02X', ord($1))/ge;
  return $s;
}

sub json_escape {
  my ($s) = @_;
  return '' unless defined $s;
  $s =~ s/\\/\\\\/g;
  $s =~ s/"/\\"/g;
  $s =~ s/\r/\\r/g;
  $s =~ s/\n/\\n/g;
  $s =~ s/\t/\\t/g;
  $s =~ s/([\x00-\x1f])/sprintf('\\u%04x', ord($1))/ge;
  return $s;
}

sub json_obj {
  my (%h) = @_;
  my @parts;
  for my $k (sort keys %h) {
    my $v = $h{$k};
    my $encoded;
    if (!defined $v) {
      $encoded = 'null';
    } elsif (ref $v eq 'SCALAR') {
      $encoded = $$v ? 'true' : 'false';
    } elsif (ref $v eq '') {
      if ($v =~ /^-?\d+$/ && $k =~ /Code|exitCode/) {
        $encoded = $v;
      } else {
        $encoded = '"' . json_escape($v) . '"';
      }
    } else {
      $encoded = 'null';
    }
    push @parts, '"' . json_escape($k) . "\":$encoded";
  }
  return '{' . join(',', @parts) . '}';
}

# Minimal JSON decoder for the Docker API shapes we need (objects/arrays/scalars).
sub json_decode {
  my ($s) = @_;
  pos($s) = 0;
  my $v = eval { _json_value(\$s) };
  return $@ ? undef : $v;
}

sub _json_value {
  my ($ref) = @_;
  $$ref =~ /\G\s+/gc;
  if ($$ref =~ /\G"/gc) {
    my $str = '';
    while (1) {
      if ($$ref =~ /\G([^"\\]+)/gc) { $str .= $1; next }
      if ($$ref =~ /\G\\(["\\\/bfnrt])/gc) {
        my %m = ('"' => '"', '\\' => '\\', '/' => '/', b => "\b", f => "\f",
                 n => "\n", r => "\r", t => "\t");
        $str .= $m{$1}; next;
      }
      if ($$ref =~ /\G\\u([0-9a-fA-F]{4})/gc) {
        $str .= chr(hex($1)); next;
      }
      if ($$ref =~ /\G"/gc) { return $str }
      die "bad string";
    }
  }
  if ($$ref =~ /\G\{/gc) {
    my %o;
    $$ref =~ /\G\s+/gc;
    if ($$ref =~ /\G\}/gc) { return \%o }
    while (1) {
      $$ref =~ /\G\s+/gc;
      my $k = _json_value($ref);
      $$ref =~ /\G\s*:\s*/gc or die "expected :";
      $o{$k} = _json_value($ref);
      $$ref =~ /\G\s+/gc;
      if ($$ref =~ /\G\}/gc) { return \%o }
      $$ref =~ /\G,/gc or die "expected ,";
    }
  }
  if ($$ref =~ /\G\[/gc) {
    my @a;
    $$ref =~ /\G\s+/gc;
    if ($$ref =~ /\G\]/gc) { return \@a }
    while (1) {
      push @a, _json_value($ref);
      $$ref =~ /\G\s+/gc;
      if ($$ref =~ /\G\]/gc) { return \@a }
      $$ref =~ /\G,/gc or die "expected ,";
    }
  }
  if ($$ref =~ /\G(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gc) { return 0 + $1 }
  if ($$ref =~ /\Gtrue/gc)  { return 1 }
  if ($$ref =~ /\Gfalse/gc) { return 0 }
  if ($$ref =~ /\Gnull/gc)  { return undef }
  die "bad json";
}
