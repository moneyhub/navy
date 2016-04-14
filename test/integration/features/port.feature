Feature: Getting port for a service

  Scenario: Retrieve the port for a service
    Given I am working with the test navy
    And there is a launched service
    When I get the internal port for port 80 for the service
    Then I should see the port

  Scenario: Retrieve the an unused port for a service
    Given I am working with the test navy
    And there is a launched service
    When I get the internal port for port 8080 for the service
    Then I shouldn't see the port
