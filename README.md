# mia-users-management

Plugin de gestion des utilisateurs de MIA.

## Badges

[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=Psychopoulet_mia-users-management&metric=ncloc)](https://sonarcloud.io/summary/new_code?id=Psychopoulet_mia-users-management)
[![Issues](https://img.shields.io/github/issues/Psychopoulet/mia-users-management.svg)](https://github.com/Psychopoulet/mia-users-management/issues)
[![Pull requests](https://img.shields.io/github/issues-pr/Psychopoulet/mia-users-management.svg)](https://github.com/Psychopoulet/mia-users-management/pulls)

[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=Psychopoulet_mia-users-management&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=Psychopoulet_mia-users-management)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=Psychopoulet_mia-users-management&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=Psychopoulet_mia-users-management)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=Psychopoulet_mia-users-management&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=Psychopoulet_mia-users-management)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=Psychopoulet_mia-users-management&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=Psychopoulet_mia-users-management)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=Psychopoulet_mia-users-management&metric=bugs)](https://sonarcloud.io/summary/new_code?id=Psychopoulet_mia-users-management)

[![Known Vulnerabilities](https://snyk.io/test/github/Psychopoulet/mia-users-management/badge.svg)](https://snyk.io/test/github/Psychopoulet/mia-users-management)

## OpenAPI

[API Descriptor](./lib/data/Descriptor.json)

## Purpose

Manage MIA accounts and their session tokens from a dedicated plugin screen: list users, create or update accounts, remove users, and review or revoke tokens.

Usernames never change after creation. Tokens can only be listed or deleted (not created or edited here).

## Who can do what

**Administrators**
- Create users (including admin accounts).
- Edit any user’s password and admin flag.
- Delete any user.
- List and delete any user’s tokens.

**Any signed-in user**
- See the user list.
- Edit their own password.
- Delete their own account.
- List and delete their own tokens.

Actions that do not apply to you are hidden in the interface.
