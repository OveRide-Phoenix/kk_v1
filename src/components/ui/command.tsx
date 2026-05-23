"use client"

import * as React from "react"
import { type DialogProps } from "@radix-ui/react-dialog"
import { Command as CommandPrimitive } from "cmdk"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"

type CommandProps = React.HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean
  label?: string
  shouldFilter?: boolean
  filter?: (value: string, search: string, keywords?: string[]) => number
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  loop?: boolean
  disablePointerSelection?: boolean
  vimBindings?: boolean
}

type CommandInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "type" | "value"
> & {
  asChild?: boolean
  value?: string
  onValueChange?: (search: string) => void
}

type CommandListProps = React.HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean
  label?: string
}

type CommandGroupProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "heading" | "value"
> & {
  asChild?: boolean
  heading?: React.ReactNode
  value?: string
  forceMount?: boolean
}

type CommandItemProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "disabled" | "onSelect" | "value"
> & {
  asChild?: boolean
  disabled?: boolean
  onSelect?: (value: string) => void
  value?: string
  keywords?: string[]
  forceMount?: boolean
}

type CommandSeparatorProps = React.HTMLAttributes<HTMLDivElement> & {
  asChild?: boolean
  alwaysRender?: boolean
}

const CommandPrimitiveRoot = CommandPrimitive as unknown as React.ForwardRefExoticComponent<
  CommandProps & React.RefAttributes<HTMLDivElement>
>

const CommandPrimitiveInput = CommandPrimitive.Input as unknown as React.ForwardRefExoticComponent<
  CommandInputProps & React.RefAttributes<HTMLInputElement>
>

const CommandPrimitiveList = CommandPrimitive.List as unknown as React.ForwardRefExoticComponent<
  CommandListProps & React.RefAttributes<HTMLDivElement>
>

const CommandPrimitiveEmpty = CommandPrimitive.Empty as unknown as React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
>

const CommandPrimitiveGroup = CommandPrimitive.Group as unknown as React.ForwardRefExoticComponent<
  CommandGroupProps & React.RefAttributes<HTMLDivElement>
>

const CommandPrimitiveSeparator =
  CommandPrimitive.Separator as unknown as React.ForwardRefExoticComponent<
    CommandSeparatorProps & React.RefAttributes<HTMLDivElement>
  >

const CommandPrimitiveItem = CommandPrimitive.Item as unknown as React.ForwardRefExoticComponent<
  CommandItemProps & React.RefAttributes<HTMLDivElement>
>

const Command = React.forwardRef<
  HTMLDivElement,
  CommandProps
>(({ className, ...props }, ref) => (
  <CommandPrimitiveRoot
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName ?? "Command"

const CommandDialog = ({ children, ...props }: DialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

const CommandInput = React.forwardRef<
  HTMLInputElement,
  CommandInputProps
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitiveInput
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  </div>
))

CommandInput.displayName = CommandPrimitive.Input.displayName ?? "CommandInput"

const CommandList = React.forwardRef<
  HTMLDivElement,
  CommandListProps
>(({ className, ...props }, ref) => (
  <CommandPrimitiveList
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
))

CommandList.displayName = CommandPrimitive.List.displayName ?? "CommandList"

const CommandEmpty = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => (
  <CommandPrimitiveEmpty
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
))

CommandEmpty.displayName = CommandPrimitive.Empty.displayName ?? "CommandEmpty"

const CommandGroup = React.forwardRef<
  HTMLDivElement,
  CommandGroupProps
>(({ className, ...props }, ref) => (
  <CommandPrimitiveGroup
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    )}
    {...props}
  />
))

CommandGroup.displayName = CommandPrimitive.Group.displayName ?? "CommandGroup"

const CommandSeparator = React.forwardRef<
  HTMLDivElement,
  CommandSeparatorProps
>(({ className, ...props }, ref) => (
  <CommandPrimitiveSeparator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
))
CommandSeparator.displayName =
  CommandPrimitive.Separator.displayName ?? "CommandSeparator"

const CommandItem = React.forwardRef<
  HTMLDivElement,
  CommandItemProps
>(({ className, ...props }, ref) => (
  <CommandPrimitiveItem
    ref={ref}
    className={cn(
      "relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      className
    )}
    {...props}
  />
))

CommandItem.displayName = CommandPrimitive.Item.displayName ?? "CommandItem"

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
CommandShortcut.displayName = "CommandShortcut"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
