import { Button } from "@/components/ui/button";

interface SharedSlotButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function SharedSlotButton({
  label,
  onClick,
  disabled = false,
}: SharedSlotButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-xl"
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </Button>
  );
}
