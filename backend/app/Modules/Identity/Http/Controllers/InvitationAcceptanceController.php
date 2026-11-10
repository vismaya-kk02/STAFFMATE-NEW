<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Identity\Actions\AcceptInvitation;
use App\Modules\Identity\Http\Requests\AcceptInvitationRequest;
use Illuminate\Http\JsonResponse;

class InvitationAcceptanceController extends Controller
{
    public function store(AcceptInvitationRequest $request, AcceptInvitation $action): JsonResponse
    {
        $action->accept(
            $request->string('token')->toString(),
            $request->string('password')->toString(),
        );

        return response()->json([
            'status' => 'accepted',
        ]);
    }
}
