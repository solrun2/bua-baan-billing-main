import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReceiptDetailsModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  receipt: {
    id: string;
    imageUrl?: string;
  } | null;
}

const ReceiptDetailsModal = ({
  open,
  setOpen,
  receipt,
}: ReceiptDetailsModalProps) => {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>รายละเอียดใบเสร็จ</DialogTitle>
        </DialogHeader>
        {receipt ? (
          <>
            {receipt.imageUrl ? (
              <img
                src={receipt.imageUrl}
                alt={`Receipt ${receipt.id}`}
                className="max-w-full max-h-80 object-cover rounded-md mt-4"
              />
            ) : (
              <p>ไม่มีรูปภาพใบเสร็จ</p>
            )}
          </>
        ) : (
          <p>Loading...</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptDetailsModal;
