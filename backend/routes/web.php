<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/email/verify', function () {
    return response()->json([
        'message' => 'Email address is not verified.',
    ], 403);
})->middleware('auth:web')->name('verification.notice');
