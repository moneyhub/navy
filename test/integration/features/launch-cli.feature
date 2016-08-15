Feature: Launching and working with an navy from the CLI

  Scenario: Launch prompt when not specifying services to launch
    Given I am working with the test navy
    When I launch a service from the CLI prompt
    Then I should see that the service is running

  Scenario: Launch without prompt when specifying services to launch
    Given I am working with the test navy
    When I launch a service from the CLI directly
    Then I should see that the service is running

  Scenario: Launch import from current working directory when navy doesn't exist
    Given I am working with a nonexistant navy
    When I launch a service from the CLI prompt from the directory with my config in
    Then I should see that the navy was imported
    And I should see that the service is running

  Scenario: Launch import from current working directory when navy doesn't exist and no config
    Given I am working with a nonexistant navy
    When I launch a service from the CLI prompt from a directory with no config in
    Then I should see that there is no compose config in the current directory
