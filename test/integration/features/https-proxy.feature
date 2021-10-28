Feature: Support HTTPS for services via proxy

  Scenario: Setting config value tlsCa-dir
    When I set the tlsCa-dir config
    Then I should see that tlsRootCaDir is set

Scenario: HTTPS for a service
    Given I am working with a test navy
    When I generate TLS certificate for a service
    Then I see the test service in https enabled services
    And I get its url with https protocol

Scenario: Enable and disable HTTPS for a service
    Given I am working with a test navy
    And I generate TLS certificate for a service
    When I launch a service which is exposed on port 443 via proxy
    Then I should be able to make a HTTPS request

    When I disable HTTPS for a test service
    Then I should be able to make a HTTP request

Scenario: Launching a service with HTTPS enabled
    Given I am working with a test navy which has a service with HTTPS enabled
    And there is a launched service
    Then I should be able to make a HTTPS request