Feature: Getting port for a service using the CLI

  Scenario: Retrieve the port for a service
    Given I am working with the test navy which has a fixed external port
    And there is a launched service
    When I get the internal port for port 80 for the service using the CLI
    Then I should see the port using the CLI

  Scenario: Retrieve the an unused port for a service
    Given I am working with the test navy which has a fixed external port
    And there is a launched service
    When I get the internal port for port 8080 for the service using the CLI
    Then I shouldn't see the port using the CLI
