Feature: Launching and working with an environment

  Scenario: Launching a service
    Given I am working with the test environment
    When I launch a service
    Then I should see the service running
