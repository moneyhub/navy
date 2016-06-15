Feature: Developing a service via the CLI

  Scenario: Putting a service into development should apply my local changes
    Given I am working with the test navy
    And there is a launched service
    And I have a local copy of the source code of the launched service
    When I put the service into development
    Then I should see that my local copy has been applied
