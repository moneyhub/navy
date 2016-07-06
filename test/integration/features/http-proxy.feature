Feature: Navy HTTP proxy

  Scenario: Launching a service and using the HTTP proxy
    Given I am working with the test navy
    When I launch a service
    Then I should be able to make a HTTP request to the service through the proxy
