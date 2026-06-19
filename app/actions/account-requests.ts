'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/app/lib/prisma'
import {
  AccountRequestSchema,
  type AccountRequestFormState,
} from '@/app/lib/definitions'

export async function createAccountRequest(
  state: AccountRequestFormState,
  formData: FormData,
): Promise<AccountRequestFormState> {
  const validatedFields = AccountRequestSchema.safeParse({
    name:        formData.get('name'),
    email:       formData.get('email'),
    phone:       formData.get('phone'),
    institution: formData.get('institution'),
    message:     formData.get('message'),
  })

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors }
  }

  await prisma.accountRequest.create({ data: validatedFields.data })
  revalidatePath('/dashboard/account-requests')

  return { success: true }
}
