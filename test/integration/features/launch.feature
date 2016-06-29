Feature: Launching and working with an navy

  Scenario: Launching all services
    Given I am working with the test navy
    When I launch the navy with no services specified
    Then I should see that all of the services are running

  Scenario: Launching a service
    Given I am working with the test navy
    When I launch a service
    Then I should see that the service is running

  Scenario: Stopping and starting services
    Given I am working with the test navy
    And there is a launched service
    When I stop the service
    Then I should see that the service is stopped
    When I start the service
    Then I should see that the service is running

  Scenario: Launching when already launched should only relaunch existing services
    Given I am working with the test navy
    And there is a launched service
    When I launch the navy with no services specified
    Then I should see that the service is running

  Scenario: Launching a Navy which doesn't exist should throw an error
    Given I am working with a nonexistant navy
    When I launch the navy with no services specified
    Then I should get an exception as the navy hasn't been initialised
