Feature: Navy HTTP proxy

  Scenario: Launching a service and using the HTTP proxy on port 80
    Given I am working with a test navy
    When I launch a service which exposes port 80
    Then I should be able to make a HTTP request to the service through the proxy

  Scenario: Launching a service and using the HTTP proxy on a different port
    Given I am working with a test navy which has a service with a different port
    When I launch a service which exposes a different port which has been explicitly configured to use the HTTP proxy
    Then I should be able to make a HTTP request to the service through the proxy

  Scenario: Launching a service and using the HTTP proxy on a different port, not port 80
    Given I am working with a test navy which has a service with a different port, not port 80
    When I launch a service which exposes a different port which has been explicitly configured to use the HTTP proxy, not port 80
    Then I should be able to make a HTTP request to the service through the proxy

  Scenario: Launching a service and using the HTTP proxy with a different auto-port
      Given I am working with a test navy which has a service with a different port, with a custom proxy auto-port
      When I launch a service which exposes a different port which has been explicitly configured as a HTTP proxy auto-port
      Then I should be able to make a HTTP request to the service through the proxy
