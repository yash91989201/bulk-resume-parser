import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { FileText } from "lucide-react";

export const TopNav = () => {
  return (
    <header className="flex items-center justify-between border-b py-6">
      <div className="flex items-center gap-2">
        <FileText className="text-primary size-6" />
        <h1>Bulk Resume Parser AI</h1>
      </div>

      <Avatar>
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
    </header>
  );
};
