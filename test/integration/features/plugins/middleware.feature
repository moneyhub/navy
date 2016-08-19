Feature: Launching a Navy with a plugin with middleware

  Scenario: Launching all services
    Given I am working with a test navy which uses the test middleware plugin to add labels
    When I launch the navy with no services specified
    Then I should see that all of the services are running with the labels added by the middleware
