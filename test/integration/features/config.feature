Feature: Retrieving and setting config

  Scenario: Retrieving config
    When I get the current config
    Then I should see the current config

  Scenario: Setting tlsCaDir path
    When I set the tlsCaDir
    Then I should see that tlsCaDir is set

  Scenario: Default navy
    When I get the status of all my navies
    Then I should see that the default navy is correct

  Scenario: Changing default navy
    When I change the default navy to something else
    Then I should see that the default navy is something else

  Scenario: External IP
    Then I should see that the default external IP is connect

  Scenario: Override external IP with environment variable
    When I override the external IP using an environment variable
    Then I should see that the external IP is what I set the environment variable to

  Scenario: Changing external IP should reconfigure launched Navies
    When I change the external IP to something else
    Then I should see that all services were reconfigured with the new external IP
