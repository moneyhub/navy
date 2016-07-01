Feature: Running custom commands defined by a plugin

  Scenario: Running a custom command
    Given I am working with the test navy which uses the test middleware plugin to add some custom commands
    When I run the custom command on the CLI
    Then I should see the output from the custom command
