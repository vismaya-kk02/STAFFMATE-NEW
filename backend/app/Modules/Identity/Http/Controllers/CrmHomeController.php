<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Identity\Services\SectionAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmHomeController extends Controller
{
    public function __construct(private readonly SectionAccess $sections) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user instanceof User) {
            abort(401);
        }

        if (! $this->sections->allowsCrm($user)) {
            return response()->json([
                'message' => 'Forbidden.',
                'reason' => 'permission',
            ], 403);
        }

        return response()->json([
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->getRoleNames()->values()->all(),
            'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
            'sections' => $this->sections->sections($user),
            'navigation' => [
                ['key' => 'home', 'label' => 'Home'],
            ],
        ]);
    }
}
