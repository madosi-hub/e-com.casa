'use server';

import { requireAdmin } from '@/lib/admin/auth';
import { db } from '@/lib/db';
import { createEmailOperations } from '@/lib/email/operations';
import type { ActionResult, ContactSummary, ContactDetail, OrderSummary, EmailSummary, IntegrationStatus } from '@/lib/email/operations-types';
import { ZodError } from 'zod';

const operations = createEmailOperations(db);
async function result<T>(operation: () => Promise<T>): Promise<ActionResult<T>> {
  try { return {ok:true,data:await operation()}; }
  catch (error) {
    if (error instanceof ZodError) return {ok:false,error:'Invalid input. Please check the fields.'};
    const safeMessages = ['Contact not found','Select a placed order, not a checkout draft','Email integration is not configured','Invalid contact subject','Request ID already used with different content','Send limit reached; wait one minute'];
    return {ok:false,error:error instanceof Error && safeMessages.includes(error.message) ? error.message : 'Email operations unavailable. Please try again.'};
  }
}
export async function loadContacts(input?: {query?:string;page?:number}): Promise<ActionResult<{messages:ContactSummary[];total:number;page:number;pageSize:number;subscribers:number;integration:IntegrationStatus}>> {
  await requireAdmin();
  return result(()=>operations.loadContacts(input));
}
export async function loadContact(id: string): Promise<ActionResult<ContactDetail>> {
  await requireAdmin();
  return result(()=>operations.loadContact(id));
}
export async function searchContactOrders(input: {contactId:string;query:string}): Promise<ActionResult<OrderSummary[]>> {
  await requireAdmin();
  return result(()=>operations.searchContactOrders(input));
}
export async function linkContactOrder(input: {contactId:string;orderNumber:string|null}): Promise<ActionResult<ContactDetail>> {
  await requireAdmin();
  return result(()=>operations.linkContactOrder(input));
}
export async function replyToContact(input: {contactId:string;message:string;requestId:string}): Promise<ActionResult<{email:EmailSummary}>> {
  await requireAdmin();
  return result(()=>operations.replyToContact(input));
}
export async function loadEmailActivity(input?: {query?:string;status?:string;page?:number}): Promise<ActionResult<{emails:EmailSummary[];total:number;page:number;pageSize:number;integration:IntegrationStatus}>> {
  await requireAdmin();
  return result(()=>operations.loadEmailActivity(input));
}
export async function syncEmailInbox(input?: {cursor?:string}): Promise<ActionResult<{imported:number;hasMore:boolean;nextCursor?:string}>> {
  await requireAdmin();
  return result(()=>operations.syncEmailInbox(input));
}
