import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../../../contexts/useToast';
import { triggerFileDownload } from '../../../services/fileDownload';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import type { Donation, PaymentMethod, PaymentStatus } from '../../../types/donation';
import type {
  IssueAnnualTaxReceiptRequest,
  IssueTaxReceiptRequest,
  IssueTaxReceiptResult,
  TaxReceiptDeliveryMode,
} from '../../../types/taxReceipt';
import {
  parseAllowedValueOrEmpty,
  parsePositiveInteger,
  safeParseStoredObject,
} from '../../../utils/persistedFilters';
import {
  downloadTaxReceiptPdf,
  fetchDonations,
  issueAnnualTaxReceipt,
  issueTaxReceipt,
} from '../state';

const DONATION_FILTERS_STORAGE_KEY = 'donations_list_filters_v1';
const PAYMENT_STATUS_VALUES = ['pending', 'completed', 'failed', 'refunded', 'cancelled'] as const;
const PAYMENT_METHOD_VALUES = [
  'cash',
  'check',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'paypal',
  'stock',
  'in_kind',
  'other',
] as const;

export const getStatusBadge = (status: string) => {
  const badges: Record<string, string> = {
    pending: 'bg-[var(--loop-yellow)] text-black',
    completed: 'bg-[var(--loop-green)] text-black',
    failed: 'bg-[var(--loop-pink)] text-black',
    refunded: 'bg-[var(--loop-cyan)] text-black',
    cancelled: 'bg-app-surface-muted text-app-text',
  };
  return badges[status] || 'bg-app-surface-muted text-app-text';
};

export const getPaymentStatusLabel = (status: string) =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (value) => value.toUpperCase());

export const getPaymentMethodLabel = (method: string | null) => {
  if (!method) return 'N/A';
  return method.replace('_', ' ').replace(/\b\w/g, (value) => value.toUpperCase());
};

export function useDonationListController() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { showError, showSuccess } = useToast();
  const financeState = useAppSelector((state) => state.finance.donations);
  const [receiptModalDonation, setReceiptModalDonation] = useState<Donation | null>(null);
  const [receiptModalMode, setReceiptModalMode] = useState<'single' | 'annual' | null>(null);
  const [defaultDeliveryMode, setDefaultDeliveryMode] =
    useState<TaxReceiptDeliveryMode>('download');
  const [isReceiptSubmitting, setIsReceiptSubmitting] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const [search, setSearch] = useState(() => {
    const fromUrl = searchParams.get('search') || '';
    if (fromUrl) return fromUrl;
    const saved = safeParseStoredObject<Record<string, unknown>>(
      localStorage.getItem(DONATION_FILTERS_STORAGE_KEY)
    );
    return typeof saved?.search === 'string' ? saved.search : '';
  });
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | ''>(() => {
    const fromUrl = parseAllowedValueOrEmpty(searchParams.get('status'), PAYMENT_STATUS_VALUES);
    if (fromUrl) return fromUrl;
    const saved = safeParseStoredObject<Record<string, unknown>>(
      localStorage.getItem(DONATION_FILTERS_STORAGE_KEY)
    );
    return parseAllowedValueOrEmpty(saved?.paymentStatus, PAYMENT_STATUS_VALUES);
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>(() => {
    const fromUrl = parseAllowedValueOrEmpty(searchParams.get('type'), PAYMENT_METHOD_VALUES);
    if (fromUrl) return fromUrl;
    const saved = safeParseStoredObject<Record<string, unknown>>(
      localStorage.getItem(DONATION_FILTERS_STORAGE_KEY)
    );
    return parseAllowedValueOrEmpty(saved?.paymentMethod, PAYMENT_METHOD_VALUES);
  });
  const [currentPage, setCurrentPage] = useState(() =>
    parsePositiveInteger(searchParams.get('page'), 1)
  );
  const hasActiveFilters = Boolean(search || paymentStatus || paymentMethod);

  const loadDonations = useCallback(() => {
    return dispatch(
      fetchDonations({
        filters: {
          search: search || undefined,
          payment_status: paymentStatus || undefined,
          payment_method: paymentMethod || undefined,
        },
        pagination: {
          page: currentPage,
          limit: 20,
          sort_by: 'donation_date',
          sort_order: 'desc',
        },
      })
    );
  }, [dispatch, search, paymentStatus, paymentMethod, currentPage]);

  useEffect(() => {
    loadDonations();
  }, [loadDonations]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (paymentStatus) params.set('status', paymentStatus);
    if (paymentMethod) params.set('type', paymentMethod);
    if (currentPage > 1) params.set('page', String(currentPage));
    setSearchParams(params, { replace: true });
    localStorage.setItem(
      DONATION_FILTERS_STORAGE_KEY,
      JSON.stringify({ search, paymentStatus, paymentMethod })
    );
  }, [search, paymentStatus, paymentMethod, currentPage, setSearchParams]);

  const clearFilters = () => {
    setSearch('');
    setPaymentStatus('');
    setPaymentMethod('');
    setCurrentPage(1);
    localStorage.removeItem(DONATION_FILTERS_STORAGE_KEY);
  };

  const applyPreset = (preset: 'completed' | 'pending' | 'card') => {
    setSearch('');
    setPaymentStatus(preset === 'card' ? '' : preset);
    setPaymentMethod(preset === 'card' ? 'credit_card' : '');
    setCurrentPage(1);
  };

  const downloadReceipt = async (receiptId: string, fallbackFilename: string) => {
    const file = await dispatch(
      downloadTaxReceiptPdf({
        receiptId,
        fallbackFilename,
      })
    ).unwrap();

    triggerFileDownload(file);
  };

  const handleReceiptResult = async (
    result: IssueTaxReceiptResult,
    deliveryMode?: TaxReceiptDeliveryMode
  ) => {
    if (deliveryMode !== 'email') {
      await downloadReceipt(result.receipt.id, `${result.receipt.receipt_number}.pdf`);
    }

    showSuccess(
      result.receipt.kind === 'annual_summary_reprint'
        ? 'Donation summary generated.'
        : 'Tax receipt processed successfully.'
    );

    if (result.delivery.warning) {
      showError(result.delivery.warning);
    } else if (result.delivery.requested && result.delivery.sent) {
      showSuccess(`Receipt emailed to ${result.delivery.recipientEmail || 'the payee on file'}.`);
    }
  };

  const handleModalSubmit = async (
    payload:
      | { mode: 'single'; request: IssueTaxReceiptRequest }
      | { mode: 'annual'; request: IssueAnnualTaxReceiptRequest }
  ) => {
    if (!receiptModalDonation) {
      return;
    }

    setIsReceiptSubmitting(true);
    try {
      const result =
        payload.mode === 'single'
          ? await dispatch(
              issueTaxReceipt({
                donationId: receiptModalDonation.donation_id,
                request: payload.request,
              })
            ).unwrap()
          : await dispatch(issueAnnualTaxReceipt(payload.request)).unwrap();

      await handleReceiptResult(result, payload.request.deliveryMode);
      await loadDonations().unwrap();
      setReceiptModalDonation(null);
      setReceiptModalMode(null);
    } catch (submitError) {
      showError(
        submitError instanceof Error ? submitError.message : 'Failed to process tax receipt'
      );
    } finally {
      setIsReceiptSubmitting(false);
    }
  };

  const openReceiptModal = (
    donation: Donation,
    mode: 'single' | 'annual',
    deliveryMode: TaxReceiptDeliveryMode = 'download'
  ) => {
    setReceiptModalDonation(donation);
    setReceiptModalMode(mode);
    setDefaultDeliveryMode(deliveryMode);
  };

  const handleDownloadExistingReceipt = async (donation: Donation) => {
    if (!donation.official_tax_receipt_id) {
      return;
    }

    try {
      await downloadReceipt(
        donation.official_tax_receipt_id,
        `${donation.official_tax_receipt_number || 'tax-receipt'}.pdf`
      );
      showSuccess('Receipt download started.');
    } catch (downloadError) {
      showError(
        downloadError instanceof Error ? downloadError.message : 'Failed to download tax receipt'
      );
    }
  };

  const closeReceiptModal = () => {
    setReceiptModalDonation(null);
    setReceiptModalMode(null);
  };

  return {
    ...financeState,
    receiptModalDonation,
    receiptModalMode,
    defaultDeliveryMode,
    isReceiptSubmitting,
    filtersExpanded,
    setFiltersExpanded,
    search,
    setSearch,
    paymentStatus,
    setPaymentStatus,
    paymentMethod,
    setPaymentMethod,
    currentPage,
    setCurrentPage,
    hasActiveFilters,
    clearFilters,
    applyPreset,
    handleModalSubmit,
    openReceiptModal,
    handleDownloadExistingReceipt,
    closeReceiptModal,
  };
}
