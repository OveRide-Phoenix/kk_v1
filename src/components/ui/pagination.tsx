import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  ),
)
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("list-none", className)} {...props} />
  ),
)
PaginationItem.displayName = "PaginationItem"

type PaginationLinkProps = React.ComponentProps<typeof Link> & {
  isActive?: boolean
  size?: "default" | "icon"
  disabled?: boolean
}

const PaginationLink = React.forwardRef<HTMLAnchorElement, PaginationLinkProps>(
  ({ className, isActive, disabled = false, size = "icon", onClick, ...props }, ref) => (
    <PaginationItem>
      <Link
        ref={ref}
        className={cn(
          buttonVariants({
            variant: isActive ? "default" : "ghost",
            size,
          }),
          disabled && "pointer-events-none opacity-50",
          className,
        )}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault()
            return
          }
          onClick?.(event)
        }}
        {...props}
      />
    </PaginationItem>
  ),
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = React.forwardRef<HTMLAnchorElement, PaginationLinkProps>(
  ({ className, children, ...props }, ref) => (
    <PaginationLink
      ref={ref}
      aria-label="Go to previous page"
      className={cn("gap-1 pl-2.5 pr-2", className)}
      size="default"
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Previous</span>
      {children}
    </PaginationLink>
  ),
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = React.forwardRef<HTMLAnchorElement, PaginationLinkProps>(
  ({ className, children, ...props }, ref) => (
    <PaginationLink
      ref={ref}
      aria-label="Go to next page"
      className={cn("gap-1 pl-2 pr-2.5", className)}
      size="default"
      {...props}
    >
      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Next</span>
      <ChevronRight className="h-4 w-4" />
      {children}
    </PaginationLink>
  ),
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = React.forwardRef<HTMLSpanElement, React.ComponentProps<"span">>(
  ({ className, ...props }, ref) => (
    <PaginationItem>
      <span
        ref={ref}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-sm font-medium text-muted-foreground",
          className,
        )}
        {...props}
      >
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">More pages</span>
      </span>
    </PaginationItem>
  ),
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
