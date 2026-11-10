<?php

namespace App\Modules\Identity\Http\Requests;

use App\Models\User;
use App\Modules\Identity\Support\PermissionName;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UpdateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $role = $this->route('role');
        $user = $this->user();

        return $user instanceof User
            && $role instanceof Role
            && $user->can('update', $role);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:60'],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::in(PermissionName::values())],
        ];
    }
}
