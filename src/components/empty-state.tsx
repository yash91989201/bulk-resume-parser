import type { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

export const EmptyState = ({
  className,
  icon,
  heading,
  text,
  ...props
}: ComponentProps<"div"> & {
  icon: React.ReactNode;
  heading: string;
  text: string;
}) => {
  return (
    <div
      className={twMerge(
        "flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8",
        className,
      )}
      {...props}
    >
      {icon}
      <h3 className="text-lg font-medium text-gray-900">{heading}</h3>
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
};
