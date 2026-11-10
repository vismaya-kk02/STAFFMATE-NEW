<?php

use Laravel\Sanctum\Sanctum;

return [

    /*
    |--------------------------------------------------------------------------
    | Stateful Domains
    |--------------------------------------------------------------------------
    |
    | Same-origin proxy on app.localhost (unified SPA) sends the browser
    | Origin through to Laravel. Legacy admin/crm hosts remain listed for
    | rollback SPAs during transition. Do not use a wildcard.
    |
    */

    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
        '%s%s',
        'app.localhost:5173,admin.localhost:5173,crm.localhost:5174,localhost,127.0.0.1,::1',
        Sanctum::currentApplicationUrlWithPort(),
    ))),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Guards
    |--------------------------------------------------------------------------
    |
    | Staffmate uses the existing web session guard. Personal access tokens
    | are not enabled for this application.
    |
    */

    'guard' => ['web'],

    /*
    |--------------------------------------------------------------------------
    | Expiration Minutes
    |--------------------------------------------------------------------------
    |
    | This value applies to personal access tokens. Staffmate does not issue
    | those tokens. Session lifetime remains the session configuration.
    |
    */

    'expiration' => null,

    /*
    |--------------------------------------------------------------------------
    | Token Prefix
    |--------------------------------------------------------------------------
    */

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

];
