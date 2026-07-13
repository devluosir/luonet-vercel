import type { Contact } from '../types';

export function createContactId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `contact_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// 确保联络人列表始终至少有一行，且有且仅有一个 isPrimary。
// 空列表时插入一行空白联络人，供表单继续编辑（不代表已保存）。
export function normalizeContactsDraft(contacts: Contact[]): Contact[] {
  if (contacts.length === 0) {
    return [{ id: createContactId(), name: '', isPrimary: true }];
  }
  const primaryIndex = contacts.findIndex((contact) => contact.isPrimary);
  const resolvedPrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0;
  return contacts.map((contact, index) => ({
    ...contact,
    isPrimary: index === resolvedPrimaryIndex,
  }));
}

export function addContact(contacts: Contact[]): Contact[] {
  return normalizeContactsDraft([
    ...contacts,
    { id: createContactId(), name: '', isPrimary: contacts.length === 0 },
  ]);
}

export function removeContact(contacts: Contact[], contactId: string): Contact[] {
  return normalizeContactsDraft(contacts.filter((contact) => contact.id !== contactId));
}

export function updateContactField(
  contacts: Contact[],
  contactId: string,
  field: keyof Omit<Contact, 'id' | 'isPrimary'>,
  value: string
): Contact[] {
  return normalizeContactsDraft(
    contacts.map((contact) => (contact.id === contactId ? { ...contact, [field]: value } : contact))
  );
}

export function setPrimaryContact(contacts: Contact[], contactId: string): Contact[] {
  return normalizeContactsDraft(
    contacts.map((contact) => ({ ...contact, isPrimary: contact.id === contactId }))
  );
}
