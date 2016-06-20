Feature: Using a specific image tag for a service

  Scenario: Setting a custom tag
    Given I am working with the test navy
    And there is a launched service
    When I change the tag of the service to a custom one
    Then I should see that the service is using the custom tag

    When I reset the tag of the service
    Then I should that the service is no longer using the custom tag
