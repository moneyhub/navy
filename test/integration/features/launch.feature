Feature: Launching and working with an environment

  Scenario: Launching a service
    Given I am working with the test environment
    When I launch a service
    Then I should see that the service is running

  Scenario: Stopping and starting services
    Given I am working with the test environment
    And there is a launched service
    When I stop the service
    Then I should see that the service is stopped
    When I start the service
    Then I should see that the service is running
