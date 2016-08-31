Example voting app
==================

This is a modified version of the example voting app over at <https://github.com/docker/example-voting-app>.

## Getting started

```sh
$ navy launch
$ navy open vote
# Voting app will open in your browser
$ navy open result
# Results app will open in your browser
```

## Development

`cd` into the `result` directory and run `navy develop`.
Now open `views/index.html` and change lines 23 and 28 to "Tabs" and "Spaces" so it looks like this:

```html
<div class="choice cats">
  <div class="label">Tabs</div>
  <div class="stat">{{aPercent | number:1}}%</div>
</div>
<div class="divider"></div>
<div class="choice dogs">
  <div class="label">Spaces</div>
  <div class="stat">{{bPercent | number:1}}%</div>
</div>
```

When you refresh the result app in your browser, you should see the changes.
