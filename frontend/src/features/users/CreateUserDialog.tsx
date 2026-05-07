"use client";

import { checkUsernameAvailability } from "./api";
import type { CreateUserPayload } from "./types";
import { type UserFormValues, UserUpsertDialog } from "./UserUpsertDialog";

interface CreateUserDialogProps {
  existingUsernames: string[];
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateUserPayload) => Promise<void>;
}

const emptyUserValues: UserFormValues = {
  name: "",
  username: "",
  role: "user",
};

export function CreateUserDialog({
  existingUsernames,
  isLoading,
  onClose,
  onSubmit,
}: CreateUserDialogProps) {
  return (
    <UserUpsertDialog
      title="Add user"
      description="A password will be generated automatically."
      submitLabel="Create user"
      busyLabel="Creating..."
      initialValues={emptyUserValues}
      existingUsernames={existingUsernames}
      checkUsernameAvailability={checkUsernameAvailability}
      isLoading={isLoading}
      onClose={onClose}
      onSubmit={async (values) => {
        await onSubmit({
          name: values.name,
          username: values.username,
          role: values.role,
        });
      }}
    />
  );
}
