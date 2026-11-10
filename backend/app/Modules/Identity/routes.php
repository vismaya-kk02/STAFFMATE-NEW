<?php

use App\Modules\Identity\Http\Controllers\AdminHomeController;
use App\Modules\Identity\Http\Controllers\CrmHomeController;
use App\Modules\Identity\Http\Controllers\CurrentUserController;
use App\Modules\Identity\Http\Controllers\EmployeeController;
use App\Modules\Identity\Http\Controllers\IdentityStateController;
use App\Modules\Identity\Http\Controllers\InvitationAcceptanceController;
use App\Modules\Identity\Http\Controllers\RoleController;
use App\Modules\Identity\Http\Middleware\RejectAuthorizationHeader;
use Illuminate\Support\Facades\Route;

Route::middleware([RejectAuthorizationHeader::class, 'auth:web'])->group(function () {
    Route::get('/me', CurrentUserController::class);
    Route::get('/identity/state', IdentityStateController::class);
});

Route::post('/invitations/accept', [InvitationAcceptanceController::class, 'store'])
    ->middleware([RejectAuthorizationHeader::class, 'throttle:invitation-accept']);

Route::middleware([
    RejectAuthorizationHeader::class,
    'auth:web',
    'mfa.enrolled',
])->group(function () {
    Route::get('/crm/home', CrmHomeController::class);

    Route::get('/admin/home', AdminHomeController::class);
    Route::get('/admin/roles', [RoleController::class, 'index']);
    Route::post('/admin/roles', [RoleController::class, 'store']);
    Route::put('/admin/roles/{role}', [RoleController::class, 'update']);
    Route::get('/admin/employees', [EmployeeController::class, 'index']);
    Route::post('/admin/employees', [EmployeeController::class, 'store']);
    Route::get('/admin/employees/{user}', [EmployeeController::class, 'show']);
    Route::put('/admin/employees/{user}/status', [EmployeeController::class, 'updateStatus']);
    Route::put('/admin/employees/{user}/role', [EmployeeController::class, 'updateRole']);
    Route::post('/admin/employees/{user}/invitation', [EmployeeController::class, 'resendInvitation']);
});
