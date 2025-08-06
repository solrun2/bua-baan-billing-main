import React from "react";
import { DocumentForm, DocumentFormProps } from "@/pages/sub/create/DocumentForm";
import { DocumentData, DocumentPayload } from "@/types/document";

export interface UnifiedDocumentFormProps extends Omit<DocumentFormProps, 'containerClassName' | 'formClassName'> {
  // เพิ่ม props เฉพาะสำหรับ unified form
  variant?: 'default' | 'compact' | 'fullscreen';
  showSummary?: boolean;
  showActions?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

export const UnifiedDocumentForm: React.FC<UnifiedDocumentFormProps> = ({
  variant = 'default',
  showSummary = true,
  showActions = true,
  theme = 'auto',
  pageTitle,
  pageSubtitle,
  editMode = false,
  documentType,
  ...props
}) => {
  // กำหนด container class ตาม variant
  const getContainerClass = () => {
    switch (variant) {
      case 'compact':
        return "container mx-auto py-4 max-w-4xl";
      case 'fullscreen':
        return "min-h-screen bg-background";
      default:
        return "container mx-auto py-6";
    }
  };

  // กำหนด form class ตาม variant
  const getFormClass = () => {
    switch (variant) {
      case 'compact':
        return "space-y-4";
      case 'fullscreen':
        return "space-y-6 p-6";
      default:
        return "space-y-6";
    }
  };

  // สร้าง custom header ตาม theme
  const getCustomHeader = () => {
    if (variant === 'fullscreen') {
      return (
        <div className="bg-background border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {pageTitle || getDefaultTitle()}
                </h1>
                <p className="text-muted-foreground">
                  {pageSubtitle || getDefaultSubtitle()}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // สร้าง custom footer ตาม theme
  const getCustomFooter = () => {
    if (variant === 'fullscreen') {
      return (
        <div className="bg-background border-t border-border p-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {editMode ? 'แก้ไขเอกสาร' : 'สร้างเอกสารใหม่'}
            </div>
            <div className="text-sm text-muted-foreground">
              {documentType === 'quotation' && 'ใบเสนอราคา'}
              {documentType === 'invoice' && 'ใบแจ้งหนี้'}
              {documentType === 'receipt' && 'ใบเสร็จ'}
              {documentType === 'tax_invoice' && 'ใบกำกับภาษี'}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // ฟังก์ชันสร้าง title เริ่มต้น
  const getDefaultTitle = () => {
    if (editMode) {
      switch (documentType) {
        case 'quotation':
          return 'แก้ไขใบเสนอราคา';
        case 'invoice':
          return 'แก้ไขใบแจ้งหนี้';
        case 'receipt':
          return 'แก้ไขใบเสร็จ';
        case 'tax_invoice':
          return 'แก้ไขใบกำกับภาษี';
        default:
          return 'แก้ไขเอกสาร';
      }
    } else {
      switch (documentType) {
        case 'quotation':
          return 'สร้างใบเสนอราคา';
        case 'invoice':
          return 'สร้างใบแจ้งหนี้';
        case 'receipt':
          return 'สร้างใบเสร็จ';
        case 'tax_invoice':
          return 'สร้างใบกำกับภาษี';
        default:
          return 'สร้างเอกสาร';
      }
    }
  };

  // ฟังก์ชันสร้าง subtitle เริ่มต้น
  const getDefaultSubtitle = () => {
    if (editMode) {
      switch (documentType) {
        case 'quotation':
          return 'แก้ไขข้อมูลใบเสนอราคา';
        case 'invoice':
          return 'แก้ไขข้อมูลใบแจ้งหนี้';
        case 'receipt':
          return 'แก้ไขข้อมูลใบเสร็จ';
        case 'tax_invoice':
          return 'แก้ไขข้อมูลใบกำกับภาษี';
        default:
          return 'แก้ไขข้อมูลเอกสาร';
      }
    } else {
      switch (documentType) {
        case 'quotation':
          return 'กรอกข้อมูลเพื่อสร้างใบเสนอราคาใหม่';
        case 'invoice':
          return 'กรอกข้อมูลเพื่อสร้างใบแจ้งหนี้ใหม่';
        case 'receipt':
          return 'กรอกข้อมูลเพื่อสร้างใบเสร็จใหม่';
        case 'tax_invoice':
          return 'กรอกข้อมูลเพื่อสร้างใบกำกับภาษีใหม่';
        default:
          return 'กรอกข้อมูลเพื่อสร้างเอกสารใหม่';
      }
    }
  };

  return (
    <DocumentForm
      {...props}
      documentType={documentType}
      editMode={editMode}
      pageTitle={pageTitle || getDefaultTitle()}
      pageSubtitle={pageSubtitle || getDefaultSubtitle()}
      containerClassName={getContainerClass()}
      formClassName={getFormClass()}
      customHeader={getCustomHeader()}
      customFooter={getCustomFooter()}
      showBackButton={showActions}
      showSaveButton={showActions}
    />
  );
};

export default UnifiedDocumentForm; 