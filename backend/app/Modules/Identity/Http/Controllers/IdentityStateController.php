<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Identity\Services\SectionAccess;
use App\Modules\Identity\Support\SessionKey;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IdentityStateController extends Controller
{
    public function __construct(private readonly SectionAccess $sections) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user instanceof User) {
            abort(401);
        }

        return response()->json([
            'email_verified' => $user->hasVerifiedEmail(),
            'mfa_enrolled' => $user->two_factor_confirmed_at !== null,
            'mfa_confirmed' => $request->hasSession()
                && $request->session()->get(SessionKey::MfaConfirmedAt) !== null,
            'roles' => $user->getRoleNames()->values()->all(),
            'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
            'sections' => $this->sections->sections($user),
        ]);
    }
}
