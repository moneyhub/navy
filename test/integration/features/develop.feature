Feature: Developing a service via the CLI

  Scenario: Putting a service into development should apply my local changes
    Given I am working with the test navy
    And there is a launched service
    And I have a local copy of the source code of the launched service
    When I put the service into development
    Then I should see that my local copy has been applied

    When I take the service out of development
    Then I should see that my local copy is no longer applied

  Scenario: Calling develop from a directory which has no .navyrc
    Given I am working with the test navy
    And there is a launched service
    When I call develop from a folder with no source code or .navyrc
    Then I should see that there are no services to put in development

  Scenario: Calling develop with a service which isn't supported in the .navyrc
    Given I am working with the test navy
    And there is a launched service
    And I have a local copy of the source code of the launched service
    When I put a different service into development
    Then I should see that I specified an invalid development target
