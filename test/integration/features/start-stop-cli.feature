Feature: Starting and stopping a service via the CLI

  Scenario: Stopping a service should stop it
    Given I am working with a test navy
    And there is a launched service
    When I stop the service via the CLI
    Then I should see that the service is stopped
    When I start the service via the CLI
    Then I should see that the service is running

  Scenario: Starting a Navy shouldn't spawn services which haven't been launched
    Given I am working with a test navy
    And there is a launched service which isn't running
    When I start the navy via the CLI
    Then I should see that just that service is running

  Scenario: Starting a Navy which doesn't exist should show an error
    Given I am working with a nonexistant navy
    When I start the navy via the CLI
    Then I should see that the navy hasn't been initialised
