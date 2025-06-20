import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

interface InputWithSuffixProps extends React.ComponentProps<"input"> {
  suffix?: string;
}

const InputWithSuffix = React.forwardRef<HTMLDivElement, InputWithSuffixProps>(
  ({ className, suffix, ...props }, ref) => {
    return (
      <div className="relative flex items-center" ref={ref}>
        <Input
          className={cn("pr-8", className)}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    )
  }
)
InputWithSuffix.displayName = "InputWithSuffix"

export { Input, InputWithSuffix }
