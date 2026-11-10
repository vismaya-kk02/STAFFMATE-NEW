<?php

namespace App\Modules\Identity\Http\Requests;

use App\Models\User;
use App\Modules\Identity\Support\PermissionName;
use Illuminate\Foundation\Http\FormRequest;

class UpdateEmployeeRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && $user->hasPermissionTo(PermissionName::AssignRole->value);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'role_id' => ['required', 'integer'],
        ];
    }
}
