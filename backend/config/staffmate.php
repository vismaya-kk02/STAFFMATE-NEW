<?php

return [

    /*
    | Unified Staffmate SPA origin (production: https://main.com, local: app.localhost).
    | Legacy admin_url / crm_url fall back to app_url for rollback compatibility.
    */

    'app_url' => env('STAFFMATE_APP_URL', 'http://app.localhost:5173'),

    'app_hosts' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('STAFFMATE_APP_HOSTS', 'app.localhost')),
    ))),

    'admin_url' => env('STAFFMATE_ADMIN_URL', env('STAFFMATE_APP_URL', 'http://app.localhost:5173')),

    'crm_url' => env('STAFFMATE_CRM_URL', env('STAFFMATE_APP_URL', 'http://app.localhost:5173')),

    'admin_hosts' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('STAFFMATE_ADMIN_HOSTS', env('STAFFMATE_APP_HOSTS', 'app.localhost'))),
    ))),

    'crm_hosts' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('STAFFMATE_CRM_HOSTS', env('STAFFMATE_APP_HOSTS', 'app.localhost'))),
    ))),

    'invitation_ttl_hours' => (int) env('STAFFMATE_INVITATION_TTL_HOURS', 72),

];
