import { Script } from "../../../types/api/script";

export const mockScript: Script = {
  UniqueIdentifier: "550e8400-e29b-41d4-a716-446655440000",
  Name: "TestScript",
  Description: "This is a test script for development",
  IncludeId: "ejScript",
  Source: "print('Hello from SuperOffice CRMScript');",
  Registered: "2024-01-15T10:30:00Z",
  RegisteredBy: "John Doe",
  Updated: "2024-01-19T14:45:00Z",
  UpdatedBy: "Jane Smith",
  Path: "Scripts/Test",
  HierarchyId: 1,
  HierarchyFullname: "SuperOffice.Scripts.Test",
};

export const mockScripts: Script[] = [
  {
    UniqueIdentifier: "550e8400-e29b-41d4-a716-446655440001",
    Name: "ValidationScript",
    Description: "Validates customer data",
    IncludeId: "ejValidation",
    Source:
      "Integer customerId = getVariable('customerId');\nif (customerId > 0) {\n  print('Valid');\n}",
    Registered: "2024-01-10T09:00:00Z",
    RegisteredBy: "Admin User",
    Updated: "2024-01-18T11:20:00Z",
    UpdatedBy: "Admin User",
    Path: "Scripts/Validation",
    HierarchyId: 2,
    HierarchyFullname: "SuperOffice.Scripts.Validation",
  },
  {
    UniqueIdentifier: "550e8400-e29b-41d4-a716-446655440002",
    Name: "EmailScript",
    Description: "Sends automated emails",
    IncludeId: "ejEmail",
    Source: "String recipient = getVariable('email');\nsendEmail(recipient, 'Subject', 'Body');",
    Registered: "2024-01-12T13:15:00Z",
    RegisteredBy: "Marketing Team",
    Updated: "2024-01-19T16:00:00Z",
    UpdatedBy: "Marketing Team",
    Path: "Scripts/Email",
    HierarchyId: 3,
    HierarchyFullname: "SuperOffice.Scripts.Email",
  },
  mockScript,
];
