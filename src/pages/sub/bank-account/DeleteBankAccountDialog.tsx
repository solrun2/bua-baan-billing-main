import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { bankAccountService } from "@/services/bankAccountService";
import { toast } from "sonner";

interface DeleteBankAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: number;
  accountName: string;
  onSuccess: () => void;
}

const DeleteBankAccountDialog = ({
  isOpen,
  onClose,
  accountId,
  accountName,
  onSuccess,
}: DeleteBankAccountDialogProps) => {
  const handleDelete = async () => {
    try {
      await bankAccountService.deleteBankAccount(accountId);
      toast.success("ลบบัญชีธนาคารสำเร็จ");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to delete bank account:", error);
      toast.error("ไม่สามารถลบบัญชีธนาคารได้");
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยืนยันการลบบัญชีธนาคาร</AlertDialogTitle>
          <AlertDialogDescription>
            คุณต้องการลบบัญชีธนาคาร "{accountName}" ใช่หรือไม่?
            การดำเนินการนี้ไม่สามารถยกเลิกได้
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            ลบ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteBankAccountDialog; 