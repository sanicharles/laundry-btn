import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Transaction, AppSettings } from '../types';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface ReceiptProps {
  transaction: Transaction;
  settings: AppSettings;
}

export default function Receipt({ transaction, settings }: ReceiptProps) {
  return (
    <div id="receipt-content" className="w-[58mm] bg-white p-2 text-[10px] font-mono text-black leading-tight">
      <div className="text-center mb-4">
        <h2 className="text-sm font-bold uppercase">{settings.laundryName}</h2>
        <p className="text-[8px]">{settings.address}</p>
        <p className="text-[8px]">WA: {settings.phone}</p>
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Nota:</span>
          <span>{transaction.invoiceNo}</span>
        </div>
        <div className="flex justify-between">
          <span>Tgl:</span>
          <span>{format(new Date(transaction.entryDate), 'dd/MM/yy HH:mm')}</span>
        </div>
        <div className="flex justify-between">
          <span>Plg:</span>
          <span className="truncate max-w-[30mm]">{transaction.customerName}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      <div className="space-y-2">
        {transaction.items ? (
          transaction.items.map((item, index) => (
            <div key={index}>
              <div className="font-bold">{item.serviceName}</div>
              <div className="flex justify-between pl-2">
                <span>{item.weight}kg x {formatCurrency(item.pricePerKg)}</span>
                <span>{formatCurrency(item.total)}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="mb-2">
            <div className="font-bold">{transaction.serviceName}</div>
            <div className="flex justify-between pl-2">
              <span>{transaction.weight}kg x {formatCurrency(transaction.pricePerKg || 0)}</span>
              <span>{formatCurrency(transaction.totalPrice)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      <div className="flex justify-between font-bold text-xs">
        <span>TOTAL:</span>
        <span>{formatCurrency(transaction.totalPrice)}</span>
      </div>

      <div className="mt-4 space-y-1">
        <div className="flex justify-between">
          <span>Estimasi:</span>
          <span>{format(new Date(transaction.estimateDate), 'dd/MM/yy', { locale: id })}</span>
        </div>
        <div className="flex justify-between">
          <span>Status:</span>
          <span>{transaction.status}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        <QRCodeSVG value={`https://wa.me/${settings.phone}`} size={60} />
        <p className="text-[8px] text-center">Scan untuk hubungi kami</p>
      </div>

      <div className="mt-6 text-center italic">
        <p>Bersih • Wangi • Rapi</p>
        <p className="mt-2 text-[8px]">Terima kasih atas kepercayaan Anda!</p>
      </div>
    </div>
  );
}
