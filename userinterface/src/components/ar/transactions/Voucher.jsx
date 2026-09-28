// Voucher.jsx
// npm install framer-motion react-icons jspdf html2canvas

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import logo from '../../../assets/images/logogo-removebg.png';
import { formatAmountInWords } from '../../../utils/numberToArabic';

import {
    FaPrint,
    FaTimes,
    FaFilePdf,
} from 'react-icons/fa';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// =============================================================
// PRINT STYLES
// =============================================================

const PRINT_STYLES = `
    .receipt-paper {
        font-family:
            Arial,
            Helvetica,
            sans-serif;
        color: #111;
        background: #fff;
    }

    .receipt-paper * {
        box-sizing: border-box;
    }

    .receipt-small {
        font-size: 9px;
        line-height: 1.25;
    }

    .receipt-medium {
        font-size: 10px;
        line-height: 1.3;
    }

    .receipt-signature-image {
        display: block;
        max-width: 125px;
        max-height: 55px;
        object-fit: contain;
        margin: 0 auto;
    }

    .receipt-signature-text {
        display: block;
        font-size: 10px;
        font-weight: 700;
    }

    .receipt-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
    }

    .receipt-table th,
    .receipt-table td {
        border: 1px solid #9ca3af;
        vertical-align: middle;
    }

    .receipt-table th {
        font-weight: 800;
        text-align: center;
    }

    .receipt-table td {
        font-weight: 500;
    }

    .receipt-table .col-s {
        width: 5%;
    }

    .receipt-table .col-fees {
        width: 21%;
    }

    .receipt-table .col-amount {
        width: 13%;
    }

    .receipt-table .col-due {
        width: 12%;
    }

    .receipt-table .col-payment {
        width: 14%;
    }

    .receipt-table .col-cheque {
        width: 10%;
    }

    .receipt-table .col-date {
        width: 11%;
    }

    .receipt-table .col-bank {
        width: 14%;
    }

    @media print {
        @page {
            size: A4 portrait;
            margin: 5mm 6mm 6mm 6mm;
        }

        html,
        body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
            background: #fff !important;
        }

        body {
            overflow: visible !important;
        }

        #deposit-voucher-print {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #111 !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
        }

        .voucher-no-print {
            display: none !important;
        }

        .voucher-paper {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
        }

        .receipt-paper {
            display: block !important;
            visibility: visible !important;
        }

        .receipt-table {
            width: 100% !important;
            page-break-inside: auto !important;
        }

        .receipt-table tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
        }

        .receipt-table thead {
            display: table-header-group !important;
        }

        .receipt-table tfoot {
            display: table-footer-group !important;
        }

        .receipt-signature-area {
            page-break-inside: avoid !important;
        }

        img {
            max-width: 100% !important;
        }
    }
`;

// =============================================================
// COMPONENT
// =============================================================

const Voucher = ({ transaction = {}, onClose }) => {
    const printRef = useRef(null);
    const [fetchedBankName, setFetchedBankName] = useState('');

    // =========================================================
    // FETCH BANK NAME
    // =========================================================

    useEffect(() => {
        const bankValue = transaction?.bank;
        const bankId =
            bankValue && typeof bankValue === 'object'
                ? bankValue.id
                : bankValue;

        if (!bankId) {
            setFetchedBankName('');
            return;
        }

        // If the transaction already contains the bank object/name, use it directly.
        if (typeof bankValue === 'object') {
            const existingName =
                bankValue.name ||
                bankValue.bank_name ||
                bankValue.title;

            if (existingName) {
                setFetchedBankName(existingName);
                return;
            }
        }

        const fetchBankName = async () => {
            try {
                const token = localStorage.getItem('access_token');

                const response = await fetch(
                    `${BASE}/api/banks/${bankId}/`,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token
                                ? { Authorization: `Bearer ${token}` }
                                : {}),
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                setFetchedBankName(
                    data?.name ||
                    data?.bank_name ||
                    data?.title ||
                    ''
                );
            } catch (error) {
                console.error('Error fetching bank name:', error);
                setFetchedBankName('');
            }
        };

        fetchBankName();
    }, [transaction?.bank]);

    // =========================================================
    // BASIC HELPERS
    // =========================================================

    const safeValue = (value, fallback = '-') => {
        if (
            value === null ||
            value === undefined ||
            value === ''
        ) {
            return fallback;
        }

        return value;
    };

    const renderValue = (value) => {
        if (
            value === null ||
            value === undefined ||
            value === ''
        ) {
            return '-';
        }

        if (typeof value === 'object') {
            return (
                value.name ||
                value.bank_name ||
                value.cashbox_name ||
                value.account_name ||
                value.title ||
                value.username ||
                value.full_name ||
                value.fullName ||
                value.description ||
                value.id ||
                '-'
            );
        }

        return value;
    };

    const getObjectName = (value) => {
        return renderValue(value);
    };

    // =========================================================
    // TRANSACTION NUMBER
    // =========================================================

    const getTransactionNumber = () => {
        return (
            transaction.transaction_no ||
            transaction.transaction_number ||
            transaction.voucher_no ||
            transaction.voucher_number ||
            transaction.receipt_no ||
            transaction.receipt_number ||
            transaction.number ||
            transaction.id ||
            'TRX-260914-0AAF'
        );
    };

    // =========================================================
    // TRN
    // =========================================================

    const getTRN = () => {
        return (
            transaction.trn ||
            transaction.tax_registration_number ||
            transaction.company_trn ||
            transaction.company_tax_number ||
            getTransactionNumber()
        );
    };

    // =========================================================
    // CURRENCY
    // =========================================================

    const getCurrency = () => {
        return (
            transaction.currency ||
            transaction.currency_code ||
            'AED'
        );
    };

    // =========================================================
    // PAYMENT METHOD
    // =========================================================

    const getPaymentMethodLabel = () => {
        const method = transaction.payment_method;

        if (
            method === 'banks' ||
            method === 'bank'
        ) {
            return 'Cheque | شيك';
        }

        if (method === 'cash') {
            return 'Cash | نقدى';
        }

        if (
            method === 'cheque' ||
            method === 'check'
        ) {
            return 'Cheque | شيك';
        }

        if (
            method === 'transfer' ||
            method === 'bank_transfer'
        ) {
            return 'Bank Transfer | تحويل بنكي';
        }

        return safeValue(method);
    };

    // =========================================================
    // ACCOUNT
    // =========================================================

    const getAccountName = () => {
        return getObjectName(
            transaction.account_from ||
            transaction.account ||
            transaction.account_name
        );
    };

    // =========================================================
    // BANK
    // =========================================================

    const getBankName = () => {
        // 1. Prefer the fetched bank name when transaction.bank contains an ID.
        if (fetchedBankName) {
            return fetchedBankName;
        }

        // 2. Prefer explicit bank_name field.
        if (
            transaction.bank_name &&
            typeof transaction.bank_name !== 'object'
        ) {
            return transaction.bank_name;
        }

        // 3. If bank_name is an object, extract its name.
        if (
            transaction.bank_name &&
            typeof transaction.bank_name === 'object'
        ) {
            return (
                transaction.bank_name.name ||
                transaction.bank_name.bank_name ||
                transaction.bank_name.title ||
                '-'
            );
        }

        // 4. If bank is already an object, prefer its name.
        if (
            transaction.bank &&
            typeof transaction.bank === 'object'
        ) {
            return (
                transaction.bank.name ||
                transaction.bank.bank_name ||
                transaction.bank.title ||
                '-'
            );
        }

        // 5. Do not display the bank ID. The name is fetched above.
        return '-';
    };

    // =========================================================
    // CASHBOX
    // =========================================================

    const getCashboxName = () => {
        return getObjectName(
            transaction.cashbox ||
            transaction.cash_box ||
            transaction.cashbox_name
        );
    };

    // =========================================================
    // CHECK BANK
    // =========================================================

    const getCheckBankName = () => {
        return getObjectName(
            transaction.check_bank ||
            transaction.cheque_bank ||
            transaction.bank
        );
    };

    // =========================================================
    // USER
    // =========================================================

    const getTransactionUserName = () => {
        return getObjectName(
            transaction.transaction_user_name ||
            transaction.created_by ||
            transaction.user ||
            transaction.employee
        );
    };

    // =========================================================
    // PERSON
    // =========================================================

    const getPersonName = () => {
        return (
            transaction.person_deliver ||
            transaction.person_name ||
            transaction.customer_name ||
            transaction.client_name ||
            transaction.customer?.name ||
            transaction.client?.name ||
            transaction.customer?.full_name ||
            transaction.client?.full_name ||
            '-'
        );
    };

    const getPersonPhone = () => {
        return (
            transaction.phone ||
            transaction.person_phone ||
            transaction.customer_phone ||
            transaction.client_phone ||
            transaction.customer?.phone ||
            transaction.client?.phone ||
            '-'
        );
    };

    const getPersonEmail = () => {
        return (
            transaction.email ||
            transaction.person_email ||
            transaction.customer_email ||
            transaction.client_email ||
            transaction.customer?.email ||
            transaction.client?.email ||
            ''
        );
    };

    // =========================================================
    // AMOUNT
    // =========================================================

    const getAmount = () => {
        const amount = Number(
            transaction.amount ??
            transaction.total_amount ??
            transaction.received_amount ??
            0
        );

        if (Number.isNaN(amount)) {
            return 0;
        }

        return amount;
    };

    const formatAmount = (amount = getAmount()) => {
        return Number(amount || 0).toLocaleString(
            'en-US',
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }
        );
    };

    // =========================================================
    // DATE
    // =========================================================

    const formatDate = (value) => {
        if (!value) {
            return '-';
        }

        try {
            const date = new Date(value);

            if (Number.isNaN(date.getTime())) {
                return value;
            }

            return date.toLocaleDateString(
                'en-GB',
                {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                }
            );
        } catch (error) {
            return value;
        }
    };

    // =========================================================
    // DATE + TIME
    // =========================================================

    const formatDateTime = (value) => {
        if (!value) {
            return '-';
        }

        try {
            const date = new Date(value);

            if (Number.isNaN(date.getTime())) {
                return value;
            }

            return date.toLocaleString(
                'en-GB',
                {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                }
            );
        } catch (error) {
            return value;
        }
    };

    // =========================================================
    // ENGLISH NUMBER TO WORDS
    // =========================================================

    const numberToWords = (number) => {
        const ones = [
            '',
            'One',
            'Two',
            'Three',
            'Four',
            'Five',
            'Six',
            'Seven',
            'Eight',
            'Nine',
            'Ten',
            'Eleven',
            'Twelve',
            'Thirteen',
            'Fourteen',
            'Fifteen',
            'Sixteen',
            'Seventeen',
            'Eighteen',
            'Nineteen',
        ];

        const tens = [
            '',
            '',
            'Twenty',
            'Thirty',
            'Forty',
            'Fifty',
            'Sixty',
            'Seventy',
            'Eighty',
            'Ninety',
        ];

        const convertBelowThousand = (num) => {
            let result = '';

            if (num >= 100) {
                result += `${ones[Math.floor(num / 100)]} Hundred`;

                num %= 100;

                if (num > 0) {
                    result += ' ';
                }
            }

            if (num >= 20) {
                result += tens[Math.floor(num / 10)];

                num %= 10;

                if (num > 0) {
                    result += ` ${ones[num]}`;
                }
            } else if (num > 0) {
                result += ones[num];
            }

            return result;
        };

        if (number === 0) {
            return 'Zero';
        }

        let num = Math.floor(number);
        let result = '';

        const millions = Math.floor(
            num / 1000000
        );

        if (millions > 0) {
            result += `${convertBelowThousand(
                millions
            )} Million`;

            num %= 1000000;

            if (num > 0) {
                result += ' ';
            }
        }

        const thousands = Math.floor(
            num / 1000
        );

        if (thousands > 0) {
            result += `${convertBelowThousand(
                thousands
            )} Thousand`;

            num %= 1000;

            if (num > 0) {
                result += ' ';
            }
        }

        if (num > 0) {
            result += convertBelowThousand(num);
        }

        return result.trim();
    };

    // =========================================================
    // ENGLISH AMOUNT
    // =========================================================

    const getEnglishAmountWords = () => {
        const custom =
            transaction.amount_to_english ||
            transaction.amount_in_words_en ||
            transaction.amount_words_en ||
            transaction.amount_in_words;

        if (custom) {
            return custom;
        }

        const amount = getAmount();

        const whole = Math.floor(amount);

        const fils = Math.round(
            (amount - whole) * 100
        );

        let result = numberToWords(whole);

        if (whole === 1) {
            result += ' Thousand';
        }

        if (fils > 0) {
            result += ` and ${numberToWords(
                fils
            )} Fils`;
        }

        return `${result} ${getCurrency()} Only`;
    };

    // =========================================================
    // ARABIC AMOUNT
    // =========================================================

    const getArabicAmountWords = () => {
        return (
            transaction.amount_to_arabic ||
            transaction.amount_in_words_ar ||
            transaction.amount_words_ar ||
            `فقط ${formatAmount()} ${
                getCurrency() === 'AED'
                    ? 'درهم إماراتي'
                    : getCurrency()
            }`
        );
    };

    // =========================================================
    // STATEMENT
    // =========================================================

    const getStatement = () => {
        return (
            transaction.statement ||
            transaction.description ||
            transaction.narration ||
            transaction.notes ||
            'استلام مبلغ إيداع'
        );
    };

    // =========================================================
    // CONTRACT INFORMATION
    // =========================================================

    const getPropertyName = () => {
        return (
            transaction.property_name ||
            transaction.property?.name ||
            transaction.project_name ||
            transaction.contract_property ||
            ''
        );
    };

    const getContractNumber = () => {
        return (
            transaction.contract_no ||
            transaction.contract_number ||
            transaction.contract_id ||
            transaction.reference_contract ||
            ''
        );
    };

    const getContractStartDate = () => {
        return (
            transaction.contract_start_date ||
            transaction.start_date ||
            transaction.from_date ||
            transaction.rental_start_date ||
            ''
        );
    };

    const getContractEndDate = () => {
        return (
            transaction.contract_end_date ||
            transaction.end_date ||
            transaction.to_date ||
            transaction.rental_end_date ||
            ''
        );
    };

    const getRentValue = () => {
        return (
            transaction.rent_value ||
            transaction.rental_value ||
            transaction.contract_value ||
            transaction.rent_amount ||
            ''
        );
    };

    // =========================================================
    // BEING
    // =========================================================

    const getBeingEnglish = () => {
        return (
            transaction.being_english ||
            transaction.being ||
            transaction.statement_english ||
            'Received Against Payment'
        );
    };

    const getBeingArabic = () => {
        return (
            transaction.being_arabic ||
            transaction.statement ||
            'وذلك عن استلام المبلغ'
        );
    };

    // =========================================================
    // TABLE ROWS
    // =========================================================

    const getTableRows = () => {
        const source =
            transaction.items ||
            transaction.fee_items ||
            transaction.receipt_items ||
            transaction.installments ||
            transaction.details ||
            transaction.lines;

        if (
            Array.isArray(source) &&
            source.length > 0
        ) {
            return source;
        }

        return [
            {
                description:
                    transaction.statement ||
                    transaction.description ||
                    'Deposit | إيداع',

                amount: getAmount(),

                due_date:
                    transaction.due_date ||
                    transaction.transaction_date,

                payment_method:
                    getPaymentMethodLabel(),

                cheque_no:
                    transaction.check_no ||
                    transaction.cheque_no ||
                    '',

                cheque_date:
                    transaction.check_date ||
                    transaction.cheque_date ||
                    transaction.transaction_date,

                bank:
                    getBankName(),
            },
        ];
    };

    // =========================================================
    // TABLE VALUES
    // =========================================================

    const getRowDescription = (row) => {
        return (
            row.description ||
            row.fee_item ||
            row.fee_name ||
            row.item ||
            row.name ||
            row.title ||
            row.statement ||
            'Deposit | إيداع'
        );
    };

    const getRowAmount = (row) => {
        return (
            row.amount ??
            row.total ??
            row.value ??
            row.price ??
            0
        );
    };

    const getRowDueDate = (row) => {
        return (
            row.due_date ||
            row.dueDate ||
            row.installment_date ||
            row.date_due ||
            transaction.transaction_date
        );
    };

    const getRowPaymentType = (row) => {
        const method =
            row.payment_method ||
            row.payment_type ||
            transaction.payment_method;

        if (
            method === 'banks' ||
            method === 'bank' ||
            method === 'cheque' ||
            method === 'check'
        ) {
            return 'Cheque | شيك';
        }

        if (method === 'cash') {
            return 'Cash | نقدى';
        }

        if (
            method === 'transfer' ||
            method === 'bank_transfer'
        ) {
            return 'Bank Transfer | تحويل';
        }

        return safeValue(
            method,
            'Cash | نقدى'
        );
    };

    const getRowChequeNumber = (row) => {
        return (
            row.cheque_no ||
            row.check_no ||
            row.cheque_number ||
            row.check_number ||
            ''
        );
    };

    const getRowChequeDate = (row) => {
        return (
            row.cheque_date ||
            row.check_date ||
            row.date ||
            transaction.transaction_date
        );
    };

    // =========================================================
    // ROW BANK — mirrors getBankName() logic for row data
    // =========================================================

    const getRowBank = (row) => {
        // 1. Prefer row.bank_name (string)
        if (
            row.bank_name &&
            typeof row.bank_name !== 'object'
        ) {
            return row.bank_name;
        }

        // 2. row.bank_name as object
        if (
            row.bank_name &&
            typeof row.bank_name === 'object'
        ) {
            return (
                row.bank_name.name ||
                row.bank_name.bank_name ||
                row.bank_name.title ||
                getBankName()
            );
        }

        // 3. row.bank as object → use .name (NOT .id)
        if (
            row.bank &&
            typeof row.bank === 'object'
        ) {
            return (
                row.bank.name ||
                row.bank.bank_name ||
                row.bank.title ||
                getBankName()
            );
        }

        // 4. row.bank as string
        if (
            row.bank &&
            typeof row.bank !== 'object'
        ) {
            return row.bank;
        }

        // 5. row.check_bank / row.cheque_bank
        if (row.check_bank) {
            return getObjectName(row.check_bank);
        }

        if (row.cheque_bank) {
            return getObjectName(row.cheque_bank);
        }

        // 6. Fallback to transaction-level bank
        return getBankName();
    };

    // =========================================================
    // CONDITIONS
    // =========================================================

    const hasDocument =
        transaction.has_document === true ||
        transaction.has_document === 'true';

    const hasCheck =
        transaction.has_check === true ||
        transaction.has_check === 'true';

    // =========================================================
    // SIGNATURE
    // =========================================================

    const renderSignature = (value) => {
        if (!value) {
            return null;
        }

        if (
            typeof value === 'string' &&
            (
                value.startsWith('data:image') ||
                value.startsWith('http://') ||
                value.startsWith('https://') ||
                value.startsWith('/')
            )
        ) {
            return (
                <img
                    src={value}
                    alt="Signature"
                    className="receipt-signature-image"
                />
            );
        }

        return (
            <span className="receipt-signature-text">
                {renderValue(value)}
            </span>
        );
    };

    // =========================================================
    // PRINT
    // =========================================================

    const handlePrint = () => {
        if (!printRef.current) {
            return;
        }

        const voucherElement =
            printRef.current.cloneNode(true);

        if (!voucherElement) {
            return;
        }

        voucherElement
            .querySelectorAll('.voucher-no-print')
            .forEach((element) => {
                element.remove();
            });

        voucherElement.id = 'voucher-print-copy';

        const printWindow = window.open(
            '',
            '_blank',
            'width=900,height=1200,scrollbars=yes,resizable=yes'
        );

        if (!printWindow) {
            window.alert(
                'Please allow pop-ups for this website to print the voucher.'
            );
            return;
        }

        const styleElements = Array.from(
            document.querySelectorAll(
                'style, link[rel="stylesheet"]'
            )
        );

        const copiedStyles = styleElements
            .map((element) => element.outerHTML)
            .join('\n');

        const printWindowStyles = `
            html,
            body {
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                min-height: 100% !important;
                background: #ffffff !important;
            }

            body {
                overflow: visible !important;
                font-family:
                    Arial,
                    Helvetica,
                    sans-serif;
                color: #111111;
            }

            #voucher-print-root {
                width: 100%;
                margin: 0;
                padding: 0;
                background: #ffffff;
            }

            #voucher-print-copy {
                display: block !important;
                position: static !important;
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #111111 !important;
                border: none !important;
                box-shadow: none !important;
                overflow: visible !important;
                visibility: visible !important;
            }

            #voucher-print-copy * {
                visibility: visible !important;
            }

            .voucher-no-print {
                display: none !important;
            }

            .voucher-paper {
                display: block !important;
                position: static !important;
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                border: none !important;
                box-shadow: none !important;
                overflow: visible !important;
            }

            .receipt-paper {
                display: block !important;
                width: 100% !important;
                font-family:
                    Arial,
                    Helvetica,
                    sans-serif !important;
                color: #111111 !important;
                background: #ffffff !important;
                visibility: visible !important;
            }

            .receipt-paper * {
                visibility: visible !important;
                box-sizing: border-box;
            }

            .receipt-table {
                width: 100% !important;
                border-collapse: collapse !important;
                table-layout: fixed !important;
                page-break-inside: auto !important;
            }

            .receipt-table th,
            .receipt-table td {
                border: 1px solid #9ca3af !important;
                vertical-align: middle !important;
            }

            .receipt-table tr {
                page-break-inside: avoid !important;
                page-break-after: auto !important;
            }

            .receipt-table thead {
                display: table-header-group !important;
            }

            .receipt-table tfoot {
                display: table-footer-group !important;
            }

            .receipt-signature-area {
                page-break-inside: avoid !important;
            }

            .receipt-signature-image {
                display: block !important;
                max-width: 125px !important;
                max-height: 55px !important;
                object-fit: contain !important;
                margin: 0 auto !important;
            }

            img {
                max-width: 100% !important;
            }

            .mx-auto {
                margin-left: auto !important;
                margin-right: auto !important;
            }

            @page {
                size: A4 portrait;
                margin: 5mm 6mm 6mm 6mm;
            }

            @media print {
                html {
                    direction: rtl !important;
                }
                body {
                    direction: rtl !important;
                    text-align: right !important;
                }

                #deposit-voucher-print {
                    direction: rtl !important;
                    text-align: right !important;
                }

                body {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 100% !important;
                    min-height: 100% !important;
                    background: #ffffff !important;
                }

                body {
                    overflow: visible !important;
                }

                #voucher-print-root {
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }

                #voucher-print-copy {
                    display: block !important;
                    position: static !important;
                    width: 100% !important;
                    max-width: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    color: #111111 !important;
                    border: none !important;
                    box-shadow: none !important;
                    overflow: visible !important;
                }

                .voucher-paper {
                    display: block !important;
                    position: static !important;
                    width: 100% !important;
                    max-width: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    border: none !important;
                    box-shadow: none !important;
                    overflow: visible !important;
                }

                .receipt-paper {
                    display: block !important;
                    visibility: visible !important;
                }

                .receipt-table {
                    width: 100% !important;
                    page-break-inside: auto !important;
                }

                .receipt-table tr {
                    page-break-inside: avoid !important;
                    page-break-after: auto !important;
                }

                .receipt-table thead {
                    display: table-header-group !important;
                }

                .receipt-table tfoot {
                    display: table-footer-group !important;
                }

                .receipt-signature-area {
                    page-break-inside: avoid !important;
                }

                .voucher-no-print {
                    display: none !important;
                }
            }
        `;

        printWindow.document.open();

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1.0"
                    />

                    <title>
                        Receipt Voucher - ${getTransactionNumber()}
                    </title>

                    ${copiedStyles}

                    <style>
                        ${PRINT_STYLES}

                        ${printWindowStyles}
                    </style>
                </head>

                <body>
                    <div id="voucher-print-root">
                        ${voucherElement.outerHTML}
                    </div>
                </body>
            </html>
        `);

        printWindow.document.close();

        const startPrinting = () => {
            const images =
                Array.from(
                    printWindow.document.images
                );

            const imagePromises = images.map(
                (image) => {
                    if (image.complete) {
                        return Promise.resolve();
                    }

                    return new Promise((resolve) => {
                        image.onload = resolve;
                        image.onerror = resolve;
                    });
                }
            );

            Promise.all(imagePromises)
                .then(() => {
                    setTimeout(() => {
                        try {
                            printWindow.focus();
                            printWindow.print();
                        } catch (error) {
                            console.error(
                                'Voucher print error:',
                                error
                            );
                        }
                    }, 300);
                });
        };

        if (
            printWindow.document.readyState ===
            'complete'
        ) {
            startPrinting();
        } else {
            printWindow.addEventListener(
                'load',
                startPrinting,
                {
                    once: true,
                }
            );
        }

        printWindow.onafterprint = () => {
            setTimeout(() => {
                try {
                    printWindow.close();
                } catch (error) {
                    // Ignore close errors.
                }
            }, 100);
        };
    };

    // =========================================================
    // DOWNLOAD PDF
    // =========================================================

    const handleDownloadPDF = async () => {
        if (!printRef.current) {
            return;
        }

        let tempContainer = null;

        try {
            const voucherElement = printRef.current.cloneNode(true);

            if (!voucherElement) {
                return;
            }

            voucherElement
                .querySelectorAll('.voucher-no-print')
                .forEach((element) => {
                    element.remove();
                });

            voucherElement.id = 'voucher-pdf-copy';

            tempContainer = document.createElement('div');
            tempContainer.id = 'voucher-pdf-temp-root';

            Object.assign(tempContainer.style, {
                position: 'fixed',
                top: '0',
                left: '-10000px',
                width: '794px',
                minHeight: '1123px',
                background: '#ffffff',
                zIndex: '2147483647',
                opacity: '1',
                visibility: 'visible',
                pointerEvents: 'none',
                overflow: 'visible',
                direction: 'rtl',
            });

            const styleElement = document.createElement('style');

            styleElement.textContent = PRINT_STYLES + `
                #voucher-pdf-copy {
                    display: block !important;
                    position: static !important;
                    width: 794px !important;
                    max-width: 794px !important;
                    min-height: 0 !important;
                    margin: 0 !important;
                    padding: 16px 16px 20px 16px !important;
                    background: #ffffff !important;
                    color: #111111 !important;
                    border: none !important;
                    box-shadow: none !important;
                    overflow: visible !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    box-sizing: border-box !important;
                    direction: rtl !important;
                    font-family: Arial, Helvetica, sans-serif !important;
                }

                #voucher-pdf-copy * {
                    visibility: visible !important;
                    opacity: 1 !important;
                    box-sizing: border-box !important;
                }

                #voucher-pdf-copy .bg-white,
                #voucher-pdf-copy.receipt-paper,
                #voucher-pdf-copy .receipt-paper {
                    background-color: #ffffff !important;
                }

                #voucher-pdf-copy [class*="bg-[#f8f7f5]"] {
                    background-color: #f8f7f5 !important;
                }

                #voucher-pdf-copy [class*="bg-[#a47d52]/10"] {
                    background-color: rgba(164, 125, 82, 0.1) !important;
                }

                #voucher-pdf-copy .bg-slate-200 {
                    background-color: #e2e8f0 !important;
                }

                #voucher-pdf-copy .bg-slate-300 {
                    background-color: #cbd5e1 !important;
                }

                #voucher-pdf-copy .bg-slate-100 {
                    background-color: #f1f5f9 !important;
                }

                #voucher-pdf-copy .bg-slate-50 {
                    background-color: #f8fafc !important;
                }

                #voucher-pdf-copy .bg-red-600 {
                    background-color: #dc2626 !important;
                }

                #voucher-pdf-copy .text-white {
                    color: #ffffff !important;
                    -webkit-text-fill-color: #ffffff !important;
                }

                #voucher-pdf-copy .text-black {
                    color: #000000 !important;
                }

                #voucher-pdf-copy .text-slate-800 {
                    color: #1e293b !important;
                }

                #voucher-pdf-copy .text-slate-700 {
                    color: #334155 !important;
                }

                #voucher-pdf-copy .text-slate-600 {
                    color: #475569 !important;
                }

                #voucher-pdf-copy .text-slate-500 {
                    color: #64748b !important;
                }

                #voucher-pdf-copy .text-gray-300 {
                    color: #d1d5db !important;
                }

                #voucher-pdf-copy .border-slate-200 {
                    border-color: #e2e8f0 !important;
                }

                #voucher-pdf-copy .border-slate-300 {
                    border-color: #cbd5e1 !important;
                }

                #voucher-pdf-copy .border-black {
                    border-color: #000000 !important;
                }

                #voucher-pdf-copy hr {
                    border: 0 !important;
                    border-top: 1px solid #d1d5db !important;
                    margin: 8px 0 !important;
                    display: block !important;
                    height: 1px !important;
                }

                #voucher-pdf-copy .receipt-table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    table-layout: fixed !important;
                }

                #voucher-pdf-copy .receipt-table th,
                #voucher-pdf-copy .receipt-table td {
                    border: 1px solid #9ca3af !important;
                    vertical-align: middle !important;
                    padding: 4px 4px !important;
                }

                #voucher-pdf-copy .receipt-table thead tr {
                    background-color: #f8f7f5 !important;
                }

                #voucher-pdf-copy .receipt-signature-image {
                    display: block !important;
                    max-width: 125px !important;
                    max-height: 55px !important;
                    object-fit: contain !important;
                    margin: 0 auto !important;
                }

                #voucher-pdf-copy .receipt-signature-text {
                    display: block !important;
                    font-size: 10px !important;
                    font-weight: 700 !important;
                }

                #voucher-pdf-copy img {
                    max-width: 100% !important;
                }

                .mx-auto {
                    margin-left: auto !important;
                    margin-right: auto !important;
                }
            `;

            tempContainer.appendChild(styleElement);
            tempContainer.appendChild(voucherElement);
            document.body.appendChild(tempContainer);

            const images = Array.from(
                tempContainer.querySelectorAll('img')
            );

            await Promise.all(
                images.map((img) => {
                    if (img.complete && img.naturalWidth > 0) {
                        return Promise.resolve();
                    }

                    return new Promise((resolve) => {
                        const finish = () => resolve();

                        img.onload = finish;
                        img.onerror = finish;

                        setTimeout(finish, 3000);
                    });
                })
            );

            await new Promise((resolve) => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(resolve);
                });
            });

            const canvas = await html2canvas(voucherElement, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: 794,
                windowWidth: 794,
                scrollX: 0,
                scrollY: 0,
                onclone: (clonedDoc) => {
                    const clonedVoucher =
                        clonedDoc.getElementById('voucher-pdf-copy');

                    if (!clonedVoucher) {
                        return;
                    }

                    clonedVoucher.style.width = '794px';
                    clonedVoucher.style.maxWidth = '794px';
                    clonedVoucher.style.direction = 'rtl';
                    clonedVoucher.style.visibility = 'visible';
                    clonedVoucher.style.opacity = '1';

                    const clonedWindow = clonedDoc.defaultView;

                    if (clonedWindow) {
                        const allElements =
                            clonedVoucher.querySelectorAll('*');

                        allElements.forEach((el) => {
                            const computed =
                                clonedWindow.getComputedStyle(el);

                            const colorProps = [
                                'color',
                                'backgroundColor',
                                'borderTopColor',
                                'borderRightColor',
                                'borderBottomColor',
                                'borderLeftColor',
                                'outlineColor',
                                'textDecorationColor',
                                'caretColor',
                                'columnRuleColor',
                            ];

                            colorProps.forEach((prop) => {
                                const value = computed[prop];

                                if (
                                    value &&
                                    value.includes('oklch')
                                ) {
                                    let fallback = '#111111';

                                    if (
                                        prop === 'backgroundColor'
                                    ) {
                                        fallback = 'transparent';
                                    } else if (
                                        prop
                                            .toLowerCase()
                                            .includes('border') ||
                                        prop === 'outlineColor' ||
                                        prop === 'columnRuleColor'
                                    ) {
                                        fallback = '#9ca3af';
                                    }

                                    try {
                                        el.style.setProperty(
                                            prop,
                                            fallback,
                                            'important'
                                        );
                                    } catch (error) {
                                        // Ignore individual style errors.
                                    }
                                }
                            });
                        });
                    }

                    clonedVoucher.querySelectorAll('*').forEach((el) => {
                        el.style.setProperty(
                            'visibility',
                            'visible',
                            'important'
                        );

                        el.style.setProperty(
                            'opacity',
                            '1',
                            'important'
                        );
                    });
                },
            });

            if (
                tempContainer &&
                tempContainer.parentNode
            ) {
                tempContainer.parentNode.removeChild(
                    tempContainer
                );
            }

            tempContainer = null;

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pdfWidth =
                pdf.internal.pageSize.getWidth();

            const pdfHeight =
                pdf.internal.pageSize.getHeight();

            const imgWidth = canvas.width;
            const imgHeight = canvas.height;

            const ratio = pdfWidth / imgWidth;

            const renderedHeight = imgHeight * ratio;

            const totalPages = Math.max(
                1,
                Math.ceil(renderedHeight / pdfHeight)
            );

            for (
                let page = 0;
                page < totalPages;
                page++
            ) {
                if (page > 0) {
                    pdf.addPage();
                }

                const sourceY =
                    page * (pdfHeight / ratio);

                const sourceHeight = Math.min(
                    pdfHeight / ratio,
                    imgHeight - sourceY
                );

                if (sourceHeight <= 0) {
                    continue;
                }

                const pageCanvas =
                    document.createElement('canvas');

                pageCanvas.width = imgWidth;
                pageCanvas.height = Math.ceil(sourceHeight);

                const pageCtx =
                    pageCanvas.getContext('2d');

                pageCtx.fillStyle = '#ffffff';
                pageCtx.fillRect(
                    0,
                    0,
                    pageCanvas.width,
                    pageCanvas.height
                );

                pageCtx.drawImage(
                    canvas,
                    0,
                    sourceY,
                    imgWidth,
                    sourceHeight,
                    0,
                    0,
                    imgWidth,
                    sourceHeight
                );

                const pageImgData =
                    pageCanvas.toDataURL('image/png');

                const pageImgHeight =
                    sourceHeight * ratio;

                pdf.addImage(
                    pageImgData,
                    'PNG',
                    0,
                    0,
                    pdfWidth,
                    pageImgHeight
                );
            }

            pdf.save(
                `Receipt-Voucher-${getTransactionNumber()}.pdf`
            );
        } catch (error) {
            console.error(
                'PDF download error:',
                error
            );

            alert(
                'An error occurred while generating the PDF. Please try again.'
            );

            if (
                tempContainer &&
                tempContainer.parentNode
            ) {
                tempContainer.parentNode.removeChild(
                    tempContainer
                );
            }
        }
    };

    // =========================================================
    // KEYBOARD
    // =========================================================

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                if (onClose) {
                    onClose();
                }
            }

            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === 'p'
            ) {
                event.preventDefault();

                handlePrint();
            }
        };

        window.addEventListener(
            'keydown',
            handleKeyDown
        );

        return () => {
            window.removeEventListener(
                'keydown',
                handleKeyDown
            );
        };
    }, [onClose]);

    // =========================================================
    // TABLE DATA
    // =========================================================

    const tableRows = getTableRows();

    const totalTableAmount =
        tableRows.reduce(
            (total, row) =>
                total +
                Number(
                    getRowAmount(row) || 0
                ),
            0
        );

    // =========================================================
    // JSX
    // =========================================================

    return (
        <div className="contents">
            <style>
                {PRINT_STYLES}
            </style>

            {/* =====================================================
                OVERLAY
            ====================================================== */}

            <motion.div
                dir="rtl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="
                    fixed
                    inset-0
                    z-[100]
                    flex
                    items-center
                    justify-center
                    bg-black/70
                    p-2
                    sm:p-4
                "
            >
                {/* =================================================
                    MODAL
                ================================================== */}

                <motion.div
                    initial={{
                        opacity: 0,
                        scale: 0.97,
                        y: 15,
                    }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0,
                    }}
                    transition={{
                        duration: 0.2,
                    }}
                    className="
                        flex
                        h-full
                        max-h-[97vh]
                        w-full
                        max-w-6xl
                        flex-col
                        overflow-hidden
                        rounded-xl
                        bg-slate-200
                        shadow-2xl
                    "
                >
                    {/* =================================================
                        ACTION BAR
                    ================================================== */}

                    <div
                        className="
                            voucher-no-print
                            flex
                            shrink-0
                            items-center
                            justify-between
                            border-b
                            border-slate-300
                            bg-white
                            px-4
                            py-3
                        "
                    >
                        <div className="text-right">
                            <h2
                                className="
                                    text-base
                                    font-black
                                    text-slate-800
                                    sm:text-lg
                                "
                            >
                                سند قبض
                            </h2>

                            <p
                                className="
                                    mt-0.5
                                    text-xs
                                    text-slate-500
                                "
                            >
                                Receipt Voucher
                            </p>
                        </div>

                        <div
                            className="
                                flex
                                items-center
                                gap-2
                            "
                        >
                            <button
                                type="button"
                                onClick={handleDownloadPDF}
                                className="
                                    flex
                                    cursor-pointer
                                    items-center
                                    gap-2
                                    rounded-md
                                    bg-red-600
                                    px-4
                                    py-2
                                    text-sm
                                    font-bold
                                    text-white
                                    transition
                                    hover:bg-red-700
                                "
                            >
                                <FaFilePdf />

                                <span>
                                    تحميل PDF
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={handlePrint}
                                className="
                                    flex
                                    cursor-pointer
                                    items-center
                                    gap-2
                                    rounded-md
                                    bg-[#a47d52]
                                    px-4
                                    py-2
                                    text-sm
                                    font-bold
                                    text-white
                                    transition
                                    hover:bg-[#8d6843]
                                "
                            >
                                <FaPrint />

                                <span>
                                    طباعة
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (onClose) {
                                        onClose();
                                    }
                                }}
                                className="
                                    flex
                                    h-9
                                    w-9
                                    cursor-pointer
                                    items-center
                                    justify-center
                                    rounded-md
                                    bg-slate-100
                                    text-slate-600
                                    transition
                                    hover:bg-red-50
                                    hover:text-red-500
                                "
                            >
                                <FaTimes />
                            </button>
                        </div>
                    </div>

                    {/* =================================================
                        PREVIEW AREA
                    ================================================== */}

                    <div
                        className="
                            flex-1
                            overflow-y-auto
                            bg-slate-300
                            p-2
                            sm:p-6
                        "
                    >
                        {/* =================================================
                            A4 PAPER
                        ================================================= */}

                        <div
                            id="deposit-voucher-print"
                            ref={printRef}
                            className="
                                voucher-paper
                                receipt-paper
                                mx-auto
                                w-full
                                max-w-[794px]
                                bg-white
                                px-4
                                py-5
                                shadow-xl
                                sm:px-6
                                sm:py-6
                            "
                        >
                            {/* =================================================
                                LOGO
                            ================================================= */}

                            <div
                                className="
                                    flex
                                    flex-col
                                    items-center
                                    justify-center
                                "
                            >
                                <img
                                    src={logo}
                                    alt="Broker City Properties"
                                    className="
                                        h-[60px]
                                        mt-3
                                        mb-7
                                        w-auto
                                        object-contain
                                        scale-[3]
                                        transform-gpu
                                    "
                                />
                            </div>

                            {/* =================================================
                                TITLE
                            ================================================= */}

                            <div
                                className="
                                    mt-2
                                    w-full
                                "
                            >
                                <div
                                    className="
                                        flex
                                        w-full
                                        items-center
                                        justify-between
                                        text-[23px]
                                        font-black
                                        leading-none
                                        sm:text-[25px]
                                        px-50
                                        mb-5
                                    "
                                >
                                    <span className="text-left">
                                        سند قبض
                                    </span>

                                    <span className="text-left">
                                        |
                                    </span>

                                    <span className="text-right">
                                        Receipt Voucher
                                    </span>
                                </div>

                                <div
                                    className="
                                        mt-2
                                        text-center
                                        text-[13px]
                                        font-black
                                    "
                                    dir="ltr"
                                >
                                    TRN : {getTRN()}
                                </div>
                            </div>

                            {/* =================================================
                                NUMBER / DATE / AMOUNT
                            ================================================== */}

                            <div
                                className="
                                    mt-4
                                    grid
                                    grid-cols-1
                                    gap-40
                                    sm:grid-cols-[1fr_420px]
                                "
                            >
                                <div
                                    className="
                                        flex
                                        flex-col
                                        items-stretch
                                    "
                                >
                                    <div
                                        className="
                                            border
                                            border-slate
                                            bg-[#f8f7f5]
                                            px-15
                                            py-2
                                            text-right
                                        "
                                        dir="ltr"
                                    >
                                        <div
                                            className="
                                                text-[26px]
                                                font-black
                                                leading-none
                                                text-right
                                            "
                                        >
                                            {formatAmount()}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className="
                                        flex
                                        flex-col
                                        justify-center
                                        gap-3
                                    "
                                >
                                    <div
                                        className="
                                            flex
                                            w-full
                                            items-center
                                            justify-between
                                            gap-2
                                            border-b
                                            border-slate-200
                                            px-1
                                            pb-1
                                            text-[12px]
                                            font-bold
                                        "
                                    >
                                        <span
                                            dir="ltr"
                                            className="
                                                w-[28%]
                                                text-left
                                                whitespace-nowrap
                                            "
                                        >
                                            :
                                            الرقم
                                        </span>

                                        <span
                                            dir="ltr"
                                            className="
                                                flex-1
                                                text-center
                                                font-black
                                                whitespace-nowrap
                                            "
                                        >
                                            {getTransactionNumber()}
                                        </span>

                                        <span
                                            dir="rtl"
                                            className="
                                                w-[28%]
                                                text-right
                                                font-black
                                                whitespace-nowrap
                                            "
                                        >
                                            :
                                            No
                                        </span>
                                    </div>

                                    <div
                                        className="
                                            flex
                                            w-full
                                            items-center
                                            justify-between
                                            gap-2
                                            border-b
                                            border-slate-200
                                            px-1
                                            pb-1
                                            text-[12px]
                                            font-bold
                                        "
                                    >
                                        <span
                                            dir="ltr"
                                            className="
                                                w-[28%]
                                                text-left
                                                whitespace-nowrap
                                            "
                                        >
                                            :
                                            التاريخ
                                        </span>

                                        <span
                                            dir="ltr"
                                            className="
                                                flex-1
                                                text-center
                                                font-black
                                                whitespace-nowrap
                                            "
                                        >
                                            {formatDate(
                                                transaction.transaction_date ||
                                                transaction.date ||
                                                transaction.created_at
                                            )}
                                        </span>

                                        <span
                                            dir="rtl"
                                            className="
                                                w-[28%]
                                                text-right
                                                font-black
                                                whitespace-nowrap
                                            "
                                        >
                                            :
                                            Date
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* =================================================
                                RECEIVED FROM
                            ================================================== */}

                            <div className="mt-2 text-center">
                                <div
                                    className="
                                        flex
                                        items-center
                                        justify-between
                                        gap-x-50
                                        gap-y-1
                                        pt-4
                                        px-1
                                        text-[13px]
                                        font-bold
                                        bg-[#f8f7f5]
                                        py-2
                                    "
                                >
                                    <span dir="ltr">
                                        :
                                        استلمنا من
                                    </span>

                                    <span
                                        dir="ltr"
                                        className="font-black"
                                    >
                                        {getPersonName()}
                                    </span>

                                    <span
                                        dir="rtl"
                                        className="font-black"
                                    >
                                        :
                                        Received From
                                    </span>
                                </div>

                                <div
                                    className="
                                        mt-1
                                        flex
                                        items-center
                                        justify-between
                                        gap-x-8
                                        text-[10px]
                                        font-semibold
                                    "
                                >
                                    {getPersonPhone() !== '-' && (
                                        <span dir="ltr">
                                            Phone :

                                            <strong className="ml-1">
                                                {getPersonPhone()}
                                            </strong>
                                        </span>
                                    )}

                                    {getPersonEmail() && (
                                        <span dir="ltr">
                                            Email :

                                            <strong className="ml-1">
                                                {getPersonEmail()}
                                            </strong>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* =================================================
                                AMOUNT IN WORDS
                            ================================================== */}
                            <div
                                className="
                                    mt-2
                                    text-center
                                    mx-auto
                                "
                            >
                                <div
                                    className="
                                        flex
                                        items-center
                                        justify-between
                                        gap-x-50
                                        gap-y-1
                                        pt-4
                                        px-1
                                        text-[13px]
                                        font-bold
                                    "
                                >
                                    <span dir="ltr">
                                        :
                                        مبلغ وقدره
                                    </span>

                                    <span
                                        dir="ltr"
                                        className="font-black"
                                    >
                                        {formatAmountInWords(transaction.amount)} درهم فقط لاغير
                                    </span>

                                    <span
                                        dir="rtl"
                                        className="font-black"
                                    >
                                        :
                                        The Sum of
                                    </span>
                                </div>
                            </div>

                            {/* =================================================
                                BEING
                            ================================================== */}

                            <div className="mt-2 text-center">
                                <div className='flex flex-col gap-0 bg-[#f8f7f5] py-1'>
                                    <div
                                        className="
                                            flex
                                            items-center
                                            justify-between
                                            gap-x-50
                                            gap-y-1
                                            pt-4
                                            px-1
                                            text-[13px]
                                            font-bold
                                            py-2
                                        "
                                    >
                                        <span dir="rtl">
                                            وذلك عن :
                                        </span>

                                        <span
                                            dir="ltr"
                                            className="font-black"
                                        >
                                            {getBeingArabic()}
                                        </span>

                                        <span
                                            dir="rtl"
                                            className="font-black"
                                        >
                                            
                                            Being
                                        </span>
                                    </div>
                                </div>

                                <div
                                    className="
                                        mt-1
                                        flex
                                        flex-wrap
                                        items-center
                                        justify-center
                                        gap-x-8
                                        text-[10px]
                                        font-semibold
                                    "
                                >
                                    {getPersonPhone() !== '-' && (
                                        <span dir="ltr">
                                            Phone :

                                            <strong className="ml-1">
                                                {getPersonPhone()}
                                            </strong>
                                        </span>
                                    )}

                                    {getPersonEmail() && (
                                        <span dir="ltr">
                                            Email :

                                            <strong className="ml-1">
                                                {getPersonEmail()}
                                            </strong>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* =================================================
                                CONTRACT / PROPERTY
                            ================================================== */}

                            {(
                                getPropertyName() ||
                                getContractNumber() ||
                                getContractStartDate() ||
                                getContractEndDate() ||
                                getRentValue()
                            ) && (
                                <div
                                    className="
                                        mt-1
                                        text-[10px]
                                        font-bold
                                    "
                                >
                                    <div
                                        className="
                                            flex
                                            flex-wrap
                                            items-center
                                            justify-between
                                            gap-x-4
                                            gap-y-1
                                        "
                                    >
                                        <span>
                                            {getPropertyName()}
                                        </span>

                                        {getContractNumber() && (
                                            <span dir="ltr">
                                                Contract No:

                                                <strong className="ml-1">
                                                    {getContractNumber()}
                                                </strong>
                                            </span>
                                        )}

                                        {getContractStartDate() && (
                                            <span dir="ltr">
                                                From:

                                                <strong className="ml-1">
                                                    {formatDate(
                                                        getContractStartDate()
                                                    )}
                                                </strong>
                                            </span>
                                        )}

                                        {getContractEndDate() && (
                                            <span dir="ltr">
                                                To:

                                                <strong className="ml-1">
                                                    {formatDate(
                                                        getContractEndDate()
                                                    )}
                                                </strong>
                                            </span>
                                        )}
                                    </div>

                                    {getRentValue() && (
                                        <div
                                            className="mt-0.5"
                                            dir="ltr"
                                        >
                                            Rent Value:

                                            <strong className="ml-1">
                                                {getCurrency()}{' '}
                                                {formatAmount(
                                                    getRentValue()
                                                )}
                                            </strong>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* =================================================
                                ARABIC CONTRACT
                            ================================================== */}

                            {(
                                getPropertyName() ||
                                getContractNumber()
                            ) && (
                                <div
                                    dir="rtl"
                                    className="
                                        mt-0.5
                                        text-right
                                        text-[10px]
                                        font-bold
                                    "
                                >
                                    {getPropertyName() && (
                                        <span>
                                            {getPropertyName()}
                                        </span>
                                    )}

                                    {getContractNumber() && (
                                        <span className="mr-5">
                                            رقم العقد:

                                            <strong className="mr-1">
                                                {getContractNumber()}
                                            </strong>
                                        </span>
                                    )}

                                    {getRentValue() && (
                                        <span className="mr-5">
                                            القيمة الإيجارية:

                                            <strong className="mr-1">
                                                {formatAmount(
                                                    getRentValue()
                                                )}{' '}
                                                درهم
                                            </strong>
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* =================================================
                                MAIN TABLE
                            ================================================== */}

                            <hr className="text-gray-300 mt-2" />

                            <div className="mt-5 w-full">
                                <table
                                    className="
                                        receipt-table
                                        text-[8px]
                                        sm:text-[9px]
                                    "
                                >
                                    <colgroup>
                                        <col className="col-s" />
                                        <col className="col-fees" />
                                        <col className="col-amount" />
                                        <col className="col-due" />
                                        <col className="col-payment" />
                                        <col className="col-cheque" />
                                        <col className="col-date" />
                                        <col className="col-bank" />
                                    </colgroup>

                                    <thead>
                                        <tr className='bg-[#f8f7f5]'>
                                            <th className="py-1.5" style={{ fontSize: '12px' }}>
                                                S
                                                <br />
                                                <span dir="rtl">س</span>
                                            </th>

                                            <th className="py-1.5" style={{ fontSize: '12px' }}>
                                                Fees Item
                                                <br />
                                                <span dir="rtl">بند الرسوم</span>
                                            </th>

                                            <th className="py-1.5" style={{ fontSize: '12px' }}>
                                                Amount
                                                <br />
                                                <span dir="rtl">المبلغ</span>
                                            </th>

                                            <th className="py-1.5" style={{ fontSize: '12px' }}>
                                                Due Date
                                                <br />
                                                <span dir="rtl">تاريخ الاستحقاق</span>
                                            </th>

                                            <th className="py-1.5" style={{ fontSize: '12px' }}>
                                                Payment Type
                                                <br />
                                                <span dir="rtl">طريقة الدفع</span>
                                            </th>

                                            <th className="py-1.5" style={{ fontSize: '12px' }}>
                                                Cheque
                                                <br />
                                                <span dir="rtl">رقم الشيك</span>
                                            </th>

                                            <th className="py-1.5" style={{ fontSize: '12px' }}>
                                                Date
                                                <br />
                                                <span dir="rtl">تاريخ الشيك</span>
                                            </th>

                                            <th className="py-1.5" style={{ fontSize: '12px' }}>
                                                Bank
                                                <br />
                                                <span dir="rtl">البنك</span>
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {tableRows.map(
                                            (row, index) => (
                                                <tr
                                                    key={
                                                        row.id ||
                                                        row.pk ||
                                                        index
                                                    }
                                                    className="text-center"
                                                >
                                                    <td
                                                        className="px-1 py-1.5 font-bold"
                                                        style={{ fontSize: '15px' }}
                                                    >
                                                        {index + 1}
                                                    </td>

                                                    <td
                                                        dir="auto"
                                                        className="
                                                            px-1
                                                            py-1.5
                                                            text-left
                                                            font-semibold
                                                        "
                                                        style={{ fontSize: '13px' }}
                                                    >
                                                        {getRowDescription(row)}
                                                    </td>

                                                    <td
                                                        className="
                                                            px-1
                                                            py-1.5
                                                            font-semibold
                                                        "
                                                        dir="ltr"
                                                        style={{ fontSize: '15px' }}
                                                    >
                                                        {formatAmount(getRowAmount(row))}
                                                    </td>

                                                    <td
                                                        className="
                                                            px-1
                                                            py-1.5
                                                            font-semibold
                                                        "
                                                        style={{ fontSize: '13px' }}
                                                        dir="ltr"
                                                    >
                                                        {formatDate(getRowDueDate(row))}
                                                    </td>

                                                    <td
                                                        className="
                                                            px-1
                                                            py-1.5
                                                            font-semibold
                                                        "
                                                        style={{ fontSize: '15px' }}
                                                    >
                                                        {getRowPaymentType(row)}
                                                    </td>

                                                    <td
                                                        className="
                                                            px-1
                                                            py-1.5
                                                            font-semibold
                                                        "
                                                        dir="ltr"
                                                        style={{ fontSize: '13px' }}
                                                    >
                                                        {getRowChequeNumber(row)}
                                                    </td>

                                                    <td
                                                        className="
                                                            px-1
                                                            py-1.5
                                                            font-semibold
                                                        "
                                                        dir="ltr"
                                                        style={{ fontSize: '13px' }}
                                                    >
                                                        {getRowChequeNumber(row)
                                                            ? formatDate(getRowChequeDate(row))
                                                            : ''}
                                                    </td>

                                                    <td
                                                        dir="auto"
                                                        className="
                                                            px-1
                                                            py-1.5
                                                            text-left
                                                            font-semibold
                                                        "
                                                        style={{ fontSize: '15px' }}
                                                    >
                                                        {getRowBank(row)}
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>

                                    <tfoot>
                                        <tr>
                                            <td
                                                colSpan={2}
                                                dir="rtl"
                                                className="
                                                    px-1
                                                    py-1.5
                                                    text-right
                                                    font-black
                                                "
                                            >
                                                الإجمالي | Total
                                            </td>

                                            <td
                                                className="
                                                    px-1
                                                    py-1.5
                                                    text-center
                                                    font-black
                                                "
                                                dir="ltr"
                                                style={{ fontSize: '13px' }}
                                            >
                                                {formatAmount(totalTableAmount)}
                                            </td>

                                            <td
                                                colSpan={5}
                                                className="
                                                    px-1
                                                    py-1.5
                                                    text-left
                                                    font-bold
                                                "
                                            >
                                                {getCurrency()}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* =================================================
                                DOCUMENT / CHECK
                            ================================================== */}

                            {(hasDocument || hasCheck) && (
                                <div
                                    className="
                                        mt-2
                                        grid
                                        grid-cols-2
                                        gap-2
                                        text-[9px]
                                        font-bold
                                    "
                                >
                                    {hasDocument && (
                                        <div dir="ltr">
                                            Document No:

                                            <strong className="ml-1">
                                                {safeValue(transaction.document_no)}
                                            </strong>
                                        </div>
                                    )}

                                    {hasCheck && (
                                        <div dir="ltr">
                                            Cheque No:

                                            <strong className="ml-1">
                                                {safeValue(
                                                    transaction.check_no ||
                                                    transaction.cheque_no
                                                )}
                                            </strong>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* =================================================
                                NOTES
                            ================================================== */}

                            {transaction.notes && (
                                <div
                                    className="
                                        mt-2
                                        text-[9px]
                                        font-semibold
                                    "
                                >
                                    <span
                                        dir="ltr"
                                        className="font-black"
                                    >
                                        Notes :
                                    </span>

                                    <span
                                        dir="rtl"
                                        className="ml-2"
                                    >
                                        {transaction.notes}
                                    </span>
                                </div>
                            )}

                            {/* =================================================
                                SIGNATURES
                            ================================================== */}

                            <div
                                className="
                                    receipt-signature-area
                                    mt-7
                                    grid
                                    grid-cols-3
                                    gap-8
                                "
                            >
                                <div className="text-center">
                                    <div
                                        className="
                                            flex
                                            h-[55px]
                                            items-end
                                            justify-center
                                        "
                                    >
                                        {renderSignature(
                                            transaction.user_signature ||
                                            transaction.prepared_signature ||
                                            getTransactionUserName()
                                        )}
                                    </div>

                                    <div className="mt-2 border-t border-black" />

                                    <div
                                        dir="ltr"
                                        className="
                                            mt-1
                                            text-[9px]
                                            font-black
                                        "
                                    >
                                        Prepared By
                                    </div>

                                    <div
                                        dir="rtl"
                                        className="text-[9px] font-bold"
                                    >
                                        إعداد
                                    </div>
                                </div>

                                <div className="text-center">
                                    <div
                                        className="
                                            flex
                                            h-[55px]
                                            items-end
                                            justify-center
                                        "
                                    >
                                        {renderSignature(
                                            transaction.manager_signature ||
                                            transaction.approved_signature
                                        )}
                                    </div>

                                    <div className="mt-2 border-t border-black" />

                                    <div
                                        dir="ltr"
                                        className="
                                            mt-1
                                            text-[9px]
                                            font-black
                                        "
                                    >
                                        Approved By
                                    </div>

                                    <div
                                        dir="rtl"
                                        className="text-[9px] font-bold"
                                    >
                                        اعتماد
                                    </div>
                                </div>

                                <div className="text-center">
                                    <div
                                        className="
                                            flex
                                            h-[55px]
                                            items-end
                                            justify-center
                                        "
                                    >
                                        {renderSignature(
                                            transaction.second_person_signature ||
                                            transaction.received_signature
                                        )}
                                    </div>

                                    <div className="mt-2 border-t border-black" />

                                    <div
                                        dir="ltr"
                                        className="
                                            mt-1
                                            text-[9px]
                                            font-black
                                        "
                                    >
                                        Received By
                                    </div>

                                    <div
                                        dir="rtl"
                                        className="text-[9px] font-bold"
                                    >
                                        استلم بواسطة
                                    </div>
                                </div>
                            </div>

                            {/* =================================================
                                FOOTER
                            ================================================== */}

                            <div
                                className="
                                    mt-6
                                    border-t
                                    border-black
                                    p-1
                                    bg-[#f8f7f5]
                                "
                            >
                                <div
                                    className="
                                        flex
                                        items-center
                                        justify-between
                                        gap-2
                                        text-[8px]
                                        font-bold
                                    "
                                >
                                    <div>1 / 1</div>
                                    <div>|</div>
                                    <div>{getTransactionUserName()}</div>
                                    <div>|</div>
                                    <div dir="ltr">
                                        {formatDateTime(
                                            transaction.created_at ||
                                            transaction.transaction_date ||
                                            transaction.date
                                        )}
                                    </div>
                                    <div>|</div>
                                    <div className="font-black">
                                        BROKER CITY PROPERTIES
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default Voucher;




// // Voucher.jsx
// // npm install framer-motion react-icons jspdf html2canvas

// import React, { useEffect, useRef } from 'react';
// import { motion } from 'framer-motion';
// import logo from '../../../assets/images/logogo-removebg.png';
// import { formatAmountInWords } from '../../../utils/numberToArabic';

// import {
//     FaPrint,
//     FaTimes,
//     FaFilePdf,
// } from 'react-icons/fa';

// import jsPDF from 'jspdf';
// import html2canvas from 'html2canvas';

// // =============================================================
// // PRINT STYLES
// // =============================================================

// const PRINT_STYLES = `
//     .receipt-paper {
//         font-family:
//             Arial,
//             Helvetica,
//             sans-serif;
//         color: #111;
//         background: #fff;
//     }

//     .receipt-paper * {
//         box-sizing: border-box;
//     }

//     .receipt-small {
//         font-size: 9px;
//         line-height: 1.25;
//     }

//     .receipt-medium {
//         font-size: 10px;
//         line-height: 1.3;
//     }

//     .receipt-signature-image {
//         display: block;
//         max-width: 125px;
//         max-height: 55px;
//         object-fit: contain;
//         margin: 0 auto;
//     }

//     .receipt-signature-text {
//         display: block;
//         font-size: 10px;
//         font-weight: 700;
//     }

//     .receipt-table {
//         width: 100%;
//         border-collapse: collapse;
//         table-layout: fixed;
//     }

//     .receipt-table th,
//     .receipt-table td {
//         border: 1px solid #9ca3af;
//         vertical-align: middle;
//     }

//     .receipt-table th {
//         font-weight: 800;
//         text-align: center;
//     }

//     .receipt-table td {
//         font-weight: 500;
//     }

//     .receipt-table .col-s {
//         width: 5%;
//     }

//     .receipt-table .col-fees {
//         width: 21%;
//     }

//     .receipt-table .col-amount {
//         width: 13%;
//     }

//     .receipt-table .col-due {
//         width: 12%;
//     }

//     .receipt-table .col-payment {
//         width: 14%;
//     }

//     .receipt-table .col-cheque {
//         width: 10%;
//     }

//     .receipt-table .col-date {
//         width: 11%;
//     }

//     .receipt-table .col-bank {
//         width: 14%;
//     }

//     @media print {
//         @page {
//             size: A4 portrait;
//             margin: 5mm 6mm 6mm 6mm;
//         }

//         html,
//         body {
//             margin: 0 !important;
//             padding: 0 !important;
//             width: 100% !important;
//             min-height: 100% !important;
//             background: #fff !important;
//         }

//         body {
//             overflow: visible !important;
//         }

//         #deposit-voucher-print {
//             display: block !important;
//             position: static !important;
//             width: 100% !important;
//             max-width: none !important;
//             margin: 0 !important;
//             padding: 0 !important;
//             background: #fff !important;
//             color: #111 !important;
//             border: none !important;
//             box-shadow: none !important;
//             overflow: visible !important;
//         }

//         .voucher-no-print {
//             display: none !important;
//         }

//         .voucher-paper {
//             display: block !important;
//             position: static !important;
//             width: 100% !important;
//             max-width: none !important;
//             margin: 0 !important;
//             padding: 0 !important;
//             background: #fff !important;
//             border: none !important;
//             box-shadow: none !important;
//             overflow: visible !important;
//         }

//         .receipt-paper {
//             display: block !important;
//             visibility: visible !important;
//         }

//         .receipt-table {
//             width: 100% !important;
//             page-break-inside: auto !important;
//         }

//         .receipt-table tr {
//             page-break-inside: avoid !important;
//             page-break-after: auto !important;
//         }

//         .receipt-table thead {
//             display: table-header-group !important;
//         }

//         .receipt-table tfoot {
//             display: table-footer-group !important;
//         }

//         .receipt-signature-area {
//             page-break-inside: avoid !important;
//         }

//         img {
//             max-width: 100% !important;
//         }
//     }
// `;

// // =============================================================
// // COMPONENT
// // =============================================================

// const Voucher = ({ transaction = {}, onClose }) => {
//     const printRef = useRef(null);

//     // =========================================================
//     // BASIC HELPERS
//     // =========================================================

//     const safeValue = (value, fallback = '-') => {
//         if (
//             value === null ||
//             value === undefined ||
//             value === ''
//         ) {
//             return fallback;
//         }

//         return value;
//     };

//     const renderValue = (value) => {
//         if (
//             value === null ||
//             value === undefined ||
//             value === ''
//         ) {
//             return '-';
//         }

//         if (typeof value === 'object') {
//             return (
//                 value.name ||
//                 value.bank_name ||
//                 value.cashbox_name ||
//                 value.account_name ||
//                 value.title ||
//                 value.username ||
//                 value.full_name ||
//                 value.fullName ||
//                 value.description ||
//                 value.id ||
//                 '-'
//             );
//         }

//         return value;
//     };

//     const getObjectName = (value) => {
//         return renderValue(value);
//     };

//     // =========================================================
//     // TRANSACTION NUMBER
//     // =========================================================

//     const getTransactionNumber = () => {
//         return (
//             transaction.transaction_no ||
//             transaction.transaction_number ||
//             transaction.voucher_no ||
//             transaction.voucher_number ||
//             transaction.receipt_no ||
//             transaction.receipt_number ||
//             transaction.number ||
//             transaction.id ||
//             'TRX-260914-0AAF'
//         );
//     };

//     // =========================================================
//     // TRN
//     // =========================================================

//     const getTRN = () => {
//         return (
//             transaction.trn ||
//             transaction.tax_registration_number ||
//             transaction.company_trn ||
//             transaction.company_tax_number ||
//             getTransactionNumber()
//         );
//     };

//     // =========================================================
//     // CURRENCY
//     // =========================================================

//     const getCurrency = () => {
//         return (
//             transaction.currency ||
//             transaction.currency_code ||
//             'AED'
//         );
//     };

//     // =========================================================
//     // PAYMENT METHOD
//     // =========================================================

//     const getPaymentMethodLabel = () => {
//         const method = transaction.payment_method;

//         if (
//             method === 'banks' ||
//             method === 'bank'
//         ) {
//             return 'banks | بنوك';
//         }

//         if (method === 'cash') {
//             return 'Cash | نقدى';
//         }

//         if (
//             method === 'cheque' ||
//             method === 'check'
//         ) {
//             return 'Cheque | شيك';
//         }

//         if (
//             method === 'transfer' ||
//             method === 'bank_transfer'
//         ) {
//             return 'Bank Transfer | تحويل بنكي';
//         }

//         return safeValue(method);
//     };

//     // =========================================================
//     // ACCOUNT
//     // =========================================================

//     const getAccountName = () => {
//         return getObjectName(
//             transaction.account_from ||
//             transaction.account ||
//             transaction.account_name
//         );
//     };

//     // =========================================================
//     // BANK
//     // =========================================================

//     const getBankName = () => {
//         // 1. Prefer explicit bank_name field (same as TransactionDetails)
//         if (
//             transaction.bank_name &&
//             typeof transaction.bank_name !== 'object'
//         ) {
//             return transaction.bank_name;
//         }

//         // 2. If bank_name is an object, extract its name
//         if (
//             transaction.bank_name &&
//             typeof transaction.bank_name === 'object'
//         ) {
//             return (
//                 transaction.bank_name.name ||
//                 transaction.bank_name.bank_name ||
//                 transaction.bank_name.title ||
//                 '-'
//             );
//         }

//         // 3. If bank is an object, prefer its name (NOT its id)
//         if (
//             transaction.bank &&
//             typeof transaction.bank === 'object'
//         ) {
//             return (
//                 transaction.bank.name ||
//                 transaction.bank.bank_name ||
//                 transaction.bank.title ||
//                 '-'
//             );
//         }

//         // 4. If bank is a primitive value (string), use it as-is
//         if (
//             transaction.bank &&
//             typeof transaction.bank !== 'object'
//         ) {
//             return transaction.bank;
//         }

//         return '-';
//     };

//     // =========================================================
//     // CASHBOX
//     // =========================================================

//     const getCashboxName = () => {
//         return getObjectName(
//             transaction.cashbox ||
//             transaction.cash_box ||
//             transaction.cashbox_name
//         );
//     };

//     // =========================================================
//     // CHECK BANK
//     // =========================================================

//     const getCheckBankName = () => {
//         return getObjectName(
//             transaction.check_bank ||
//             transaction.cheque_bank ||
//             transaction.bank
//         );
//     };

//     // =========================================================
//     // USER
//     // =========================================================

//     const getTransactionUserName = () => {
//         return getObjectName(
//             transaction.transaction_user_name ||
//             transaction.created_by ||
//             transaction.user ||
//             transaction.employee
//         );
//     };

//     // =========================================================
//     // PERSON
//     // =========================================================

//     const getPersonName = () => {
//         return (
//             transaction.person_deliver ||
//             transaction.person_name ||
//             transaction.customer_name ||
//             transaction.client_name ||
//             transaction.customer?.name ||
//             transaction.client?.name ||
//             transaction.customer?.full_name ||
//             transaction.client?.full_name ||
//             '-'
//         );
//     };

//     const getPersonPhone = () => {
//         return (
//             transaction.phone ||
//             transaction.person_phone ||
//             transaction.customer_phone ||
//             transaction.client_phone ||
//             transaction.customer?.phone ||
//             transaction.client?.phone ||
//             '-'
//         );
//     };

//     const getPersonEmail = () => {
//         return (
//             transaction.email ||
//             transaction.person_email ||
//             transaction.customer_email ||
//             transaction.client_email ||
//             transaction.customer?.email ||
//             transaction.client?.email ||
//             ''
//         );
//     };

//     // =========================================================
//     // AMOUNT
//     // =========================================================

//     const getAmount = () => {
//         const amount = Number(
//             transaction.amount ??
//             transaction.total_amount ??
//             transaction.received_amount ??
//             0
//         );

//         if (Number.isNaN(amount)) {
//             return 0;
//         }

//         return amount;
//     };

//     const formatAmount = (amount = getAmount()) => {
//         return Number(amount || 0).toLocaleString(
//             'en-US',
//             {
//                 minimumFractionDigits: 2,
//                 maximumFractionDigits: 2,
//             }
//         );
//     };

//     // =========================================================
//     // DATE
//     // =========================================================

//     const formatDate = (value) => {
//         if (!value) {
//             return '-';
//         }

//         try {
//             const date = new Date(value);

//             if (Number.isNaN(date.getTime())) {
//                 return value;
//             }

//             return date.toLocaleDateString(
//                 'en-GB',
//                 {
//                     day: '2-digit',
//                     month: '2-digit',
//                     year: 'numeric',
//                 }
//             );
//         } catch (error) {
//             return value;
//         }
//     };

//     // =========================================================
//     // DATE + TIME
//     // =========================================================

//     const formatDateTime = (value) => {
//         if (!value) {
//             return '-';
//         }

//         try {
//             const date = new Date(value);

//             if (Number.isNaN(date.getTime())) {
//                 return value;
//             }

//             return date.toLocaleString(
//                 'en-GB',
//                 {
//                     day: '2-digit',
//                     month: '2-digit',
//                     year: 'numeric',
//                     hour: '2-digit',
//                     minute: '2-digit',
//                     second: '2-digit',
//                     hour12: false,
//                 }
//             );
//         } catch (error) {
//             return value;
//         }
//     };

//     // =========================================================
//     // ENGLISH NUMBER TO WORDS
//     // =========================================================

//     const numberToWords = (number) => {
//         const ones = [
//             '',
//             'One',
//             'Two',
//             'Three',
//             'Four',
//             'Five',
//             'Six',
//             'Seven',
//             'Eight',
//             'Nine',
//             'Ten',
//             'Eleven',
//             'Twelve',
//             'Thirteen',
//             'Fourteen',
//             'Fifteen',
//             'Sixteen',
//             'Seventeen',
//             'Eighteen',
//             'Nineteen',
//         ];

//         const tens = [
//             '',
//             '',
//             'Twenty',
//             'Thirty',
//             'Forty',
//             'Fifty',
//             'Sixty',
//             'Seventy',
//             'Eighty',
//             'Ninety',
//         ];

//         const convertBelowThousand = (num) => {
//             let result = '';

//             if (num >= 100) {
//                 result += `${ones[Math.floor(num / 100)]} Hundred`;

//                 num %= 100;

//                 if (num > 0) {
//                     result += ' ';
//                 }
//             }

//             if (num >= 20) {
//                 result += tens[Math.floor(num / 10)];

//                 num %= 10;

//                 if (num > 0) {
//                     result += ` ${ones[num]}`;
//                 }
//             } else if (num > 0) {
//                 result += ones[num];
//             }

//             return result;
//         };

//         if (number === 0) {
//             return 'Zero';
//         }

//         let num = Math.floor(number);
//         let result = '';

//         const millions = Math.floor(
//             num / 1000000
//         );

//         if (millions > 0) {
//             result += `${convertBelowThousand(
//                 millions
//             )} Million`;

//             num %= 1000000;

//             if (num > 0) {
//                 result += ' ';
//             }
//         }

//         const thousands = Math.floor(
//             num / 1000
//         );

//         if (thousands > 0) {
//             result += `${convertBelowThousand(
//                 thousands
//             )} Thousand`;

//             num %= 1000;

//             if (num > 0) {
//                 result += ' ';
//             }
//         }

//         if (num > 0) {
//             result += convertBelowThousand(num);
//         }

//         return result.trim();
//     };

//     // =========================================================
//     // ENGLISH AMOUNT
//     // =========================================================

//     const getEnglishAmountWords = () => {
//         const custom =
//             transaction.amount_to_english ||
//             transaction.amount_in_words_en ||
//             transaction.amount_words_en ||
//             transaction.amount_in_words;

//         if (custom) {
//             return custom;
//         }

//         const amount = getAmount();

//         const whole = Math.floor(amount);

//         const fils = Math.round(
//             (amount - whole) * 100
//         );

//         let result = numberToWords(whole);

//         if (whole === 1) {
//             result += ' Thousand';
//         }

//         if (fils > 0) {
//             result += ` and ${numberToWords(
//                 fils
//             )} Fils`;
//         }

//         return `${result} ${getCurrency()} Only`;
//     };

//     // =========================================================
//     // ARABIC AMOUNT
//     // =========================================================

//     const getArabicAmountWords = () => {
//         return (
//             transaction.amount_to_arabic ||
//             transaction.amount_in_words_ar ||
//             transaction.amount_words_ar ||
//             `فقط ${formatAmount()} ${
//                 getCurrency() === 'AED'
//                     ? 'درهم إماراتي'
//                     : getCurrency()
//             }`
//         );
//     };

//     // =========================================================
//     // STATEMENT
//     // =========================================================

//     const getStatement = () => {
//         return (
//             transaction.statement ||
//             transaction.description ||
//             transaction.narration ||
//             transaction.notes ||
//             'استلام مبلغ إيداع'
//         );
//     };

//     // =========================================================
//     // CONTRACT INFORMATION
//     // =========================================================

//     const getPropertyName = () => {
//         return (
//             transaction.property_name ||
//             transaction.property?.name ||
//             transaction.project_name ||
//             transaction.contract_property ||
//             ''
//         );
//     };

//     const getContractNumber = () => {
//         return (
//             transaction.contract_no ||
//             transaction.contract_number ||
//             transaction.contract_id ||
//             transaction.reference_contract ||
//             ''
//         );
//     };

//     const getContractStartDate = () => {
//         return (
//             transaction.contract_start_date ||
//             transaction.start_date ||
//             transaction.from_date ||
//             transaction.rental_start_date ||
//             ''
//         );
//     };

//     const getContractEndDate = () => {
//         return (
//             transaction.contract_end_date ||
//             transaction.end_date ||
//             transaction.to_date ||
//             transaction.rental_end_date ||
//             ''
//         );
//     };

//     const getRentValue = () => {
//         return (
//             transaction.rent_value ||
//             transaction.rental_value ||
//             transaction.contract_value ||
//             transaction.rent_amount ||
//             ''
//         );
//     };

//     // =========================================================
//     // BEING
//     // =========================================================

//     const getBeingEnglish = () => {
//         return (
//             transaction.being_english ||
//             transaction.being ||
//             transaction.statement_english ||
//             'Received Against Payment'
//         );
//     };

//     const getBeingArabic = () => {
//         return (
//             transaction.being_arabic ||
//             transaction.statement ||
//             'وذلك عن استلام المبلغ'
//         );
//     };

//     // =========================================================
//     // TABLE ROWS
//     // =========================================================

//     const getTableRows = () => {
//         const source =
//             transaction.items ||
//             transaction.fee_items ||
//             transaction.receipt_items ||
//             transaction.installments ||
//             transaction.details ||
//             transaction.lines;

//         if (
//             Array.isArray(source) &&
//             source.length > 0
//         ) {
//             return source;
//         }

//         return [
//             {
//                 description:
//                     transaction.statement ||
//                     transaction.description ||
//                     'Deposit | إيداع',

//                 amount: getAmount(),

//                 due_date:
//                     transaction.due_date ||
//                     transaction.transaction_date,

//                 payment_method:
//                     getPaymentMethodLabel(),

//                 cheque_no:
//                     transaction.check_no ||
//                     transaction.cheque_no ||
//                     '',

//                 cheque_date:
//                     transaction.check_date ||
//                     transaction.cheque_date ||
//                     transaction.transaction_date,

//                 bank:
//                     getBankName(),
//             },
//         ];
//     };

//     // =========================================================
//     // TABLE VALUES
//     // =========================================================

//     const getRowDescription = (row) => {
//         return (
//             row.description ||
//             row.fee_item ||
//             row.fee_name ||
//             row.item ||
//             row.name ||
//             row.title ||
//             row.statement ||
//             'Deposit | إيداع'
//         );
//     };

//     const getRowAmount = (row) => {
//         return (
//             row.amount ??
//             row.total ??
//             row.value ??
//             row.price ??
//             0
//         );
//     };

//     const getRowDueDate = (row) => {
//         return (
//             row.due_date ||
//             row.dueDate ||
//             row.installment_date ||
//             row.date_due ||
//             transaction.transaction_date
//         );
//     };

//     const getRowPaymentType = (row) => {
//         const method =
//             row.payment_method ||
//             row.payment_type ||
//             transaction.payment_method;

//         if (
//             method === 'banks' ||
//             method === 'bank' ||
//             method === 'cheque' ||
//             method === 'check'
//         ) {
//             return 'Cheque | شيك';
//         }

//         if (method === 'cash') {
//             return 'Cash | نقدى';
//         }

//         if (
//             method === 'transfer' ||
//             method === 'bank_transfer'
//         ) {
//             return 'Bank Transfer | تحويل';
//         }

//         return safeValue(
//             method,
//             'Cash | نقدى'
//         );
//     };

//     const getRowChequeNumber = (row) => {
//         return (
//             row.cheque_no ||
//             row.check_no ||
//             row.cheque_number ||
//             row.check_number ||
//             ''
//         );
//     };

//     const getRowChequeDate = (row) => {
//         return (
//             row.cheque_date ||
//             row.check_date ||
//             row.date ||
//             transaction.transaction_date
//         );
//     };

//     // =========================================================
//     // ROW BANK — mirrors getBankName() logic for row data
//     // =========================================================

//     const getRowBank = (row) => {
//         // 1. Prefer row.bank_name (string)
//         if (
//             row.bank_name &&
//             typeof row.bank_name !== 'object'
//         ) {
//             return row.bank_name;
//         }

//         // 2. row.bank_name as object
//         if (
//             row.bank_name &&
//             typeof row.bank_name === 'object'
//         ) {
//             return (
//                 row.bank_name.name ||
//                 row.bank_name.bank_name ||
//                 row.bank_name.title ||
//                 getBankName()
//             );
//         }

//         // 3. row.bank as object → use .name (NOT .id)
//         if (
//             row.bank &&
//             typeof row.bank === 'object'
//         ) {
//             return (
//                 row.bank.name ||
//                 row.bank.bank_name ||
//                 row.bank.title ||
//                 getBankName()
//             );
//         }

//         // 4. row.bank as string
//         if (
//             row.bank &&
//             typeof row.bank !== 'object'
//         ) {
//             return row.bank;
//         }

//         // 5. row.check_bank / row.cheque_bank
//         if (row.check_bank) {
//             return getObjectName(row.check_bank);
//         }

//         if (row.cheque_bank) {
//             return getObjectName(row.cheque_bank);
//         }

//         // 6. Fallback to transaction-level bank
//         return getBankName();
//     };

//     // =========================================================
//     // CONDITIONS
//     // =========================================================

//     const hasDocument =
//         transaction.has_document === true ||
//         transaction.has_document === 'true';

//     const hasCheck =
//         transaction.has_check === true ||
//         transaction.has_check === 'true';

//     // =========================================================
//     // SIGNATURE
//     // =========================================================

//     const renderSignature = (value) => {
//         if (!value) {
//             return null;
//         }

//         if (
//             typeof value === 'string' &&
//             (
//                 value.startsWith('data:image') ||
//                 value.startsWith('http://') ||
//                 value.startsWith('https://') ||
//                 value.startsWith('/')
//             )
//         ) {
//             return (
//                 <img
//                     src={value}
//                     alt="Signature"
//                     className="receipt-signature-image"
//                 />
//             );
//         }

//         return (
//             <span className="receipt-signature-text">
//                 {renderValue(value)}
//             </span>
//         );
//     };

//     // =========================================================
//     // PRINT
//     // =========================================================

//     const handlePrint = () => {
//         if (!printRef.current) {
//             return;
//         }

//         const voucherElement =
//             printRef.current.cloneNode(true);

//         if (!voucherElement) {
//             return;
//         }

//         voucherElement
//             .querySelectorAll('.voucher-no-print')
//             .forEach((element) => {
//                 element.remove();
//             });

//         voucherElement.id = 'voucher-print-copy';

//         const printWindow = window.open(
//             '',
//             '_blank',
//             'width=900,height=1200,scrollbars=yes,resizable=yes'
//         );

//         if (!printWindow) {
//             window.alert(
//                 'Please allow pop-ups for this website to print the voucher.'
//             );
//             return;
//         }

//         const styleElements = Array.from(
//             document.querySelectorAll(
//                 'style, link[rel="stylesheet"]'
//             )
//         );

//         const copiedStyles = styleElements
//             .map((element) => element.outerHTML)
//             .join('\n');

//         const printWindowStyles = `
//             html,
//             body {
//                 margin: 0 !important;
//                 padding: 0 !important;
//                 width: 100% !important;
//                 min-height: 100% !important;
//                 background: #ffffff !important;
//             }

//             body {
//                 overflow: visible !important;
//                 font-family:
//                     Arial,
//                     Helvetica,
//                     sans-serif;
//                 color: #111111;
//             }

//             #voucher-print-root {
//                 width: 100%;
//                 margin: 0;
//                 padding: 0;
//                 background: #ffffff;
//             }

//             #voucher-print-copy {
//                 display: block !important;
//                 position: static !important;
//                 width: 100% !important;
//                 max-width: none !important;
//                 margin: 0 !important;
//                 padding: 0 !important;
//                 background: #ffffff !important;
//                 color: #111111 !important;
//                 border: none !important;
//                 box-shadow: none !important;
//                 overflow: visible !important;
//                 visibility: visible !important;
//             }

//             #voucher-print-copy * {
//                 visibility: visible !important;
//             }

//             .voucher-no-print {
//                 display: none !important;
//             }

//             .voucher-paper {
//                 display: block !important;
//                 position: static !important;
//                 width: 100% !important;
//                 max-width: none !important;
//                 margin: 0 !important;
//                 padding: 0 !important;
//                 background: #ffffff !important;
//                 border: none !important;
//                 box-shadow: none !important;
//                 overflow: visible !important;
//             }

//             .receipt-paper {
//                 display: block !important;
//                 width: 100% !important;
//                 font-family:
//                     Arial,
//                     Helvetica,
//                     sans-serif !important;
//                 color: #111111 !important;
//                 background: #ffffff !important;
//                 visibility: visible !important;
//             }

//             .receipt-paper * {
//                 visibility: visible !important;
//                 box-sizing: border-box;
//             }

//             .receipt-table {
//                 width: 100% !important;
//                 border-collapse: collapse !important;
//                 table-layout: fixed !important;
//                 page-break-inside: auto !important;
//             }

//             .receipt-table th,
//             .receipt-table td {
//                 border: 1px solid #9ca3af !important;
//                 vertical-align: middle !important;
//             }

//             .receipt-table tr {
//                 page-break-inside: avoid !important;
//                 page-break-after: auto !important;
//             }

//             .receipt-table thead {
//                 display: table-header-group !important;
//             }

//             .receipt-table tfoot {
//                 display: table-footer-group !important;
//             }

//             .receipt-signature-area {
//                 page-break-inside: avoid !important;
//             }

//             .receipt-signature-image {
//                 display: block !important;
//                 max-width: 125px !important;
//                 max-height: 55px !important;
//                 object-fit: contain !important;
//                 margin: 0 auto !important;
//             }

//             img {
//                 max-width: 100% !important;
//             }

//             .mx-auto {
//                 margin-left: auto !important;
//                 margin-right: auto !important;
//             }

//             @page {
//                 size: A4 portrait;
//                 margin: 5mm 6mm 6mm 6mm;
//             }

//             @media print {
//                 html {
//                     direction: rtl !important;
//                 }
//                 body {
//                     direction: rtl !important;
//                     text-align: right !important;
//                 }

//                 #deposit-voucher-print {
//                     direction: rtl !important;
//                     text-align: right !important;
//                 }

//                 body {
//                     margin: 0 !important;
//                     padding: 0 !important;
//                     width: 100% !important;
//                     min-height: 100% !important;
//                     background: #ffffff !important;
//                 }

//                 body {
//                     overflow: visible !important;
//                 }

//                 #voucher-print-root {
//                     width: 100% !important;
//                     margin: 0 !important;
//                     padding: 0 !important;
//                 }

//                 #voucher-print-copy {
//                     display: block !important;
//                     position: static !important;
//                     width: 100% !important;
//                     max-width: none !important;
//                     margin: 0 !important;
//                     padding: 0 !important;
//                     background: #ffffff !important;
//                     color: #111111 !important;
//                     border: none !important;
//                     box-shadow: none !important;
//                     overflow: visible !important;
//                 }

//                 .voucher-paper {
//                     display: block !important;
//                     position: static !important;
//                     width: 100% !important;
//                     max-width: none !important;
//                     margin: 0 !important;
//                     padding: 0 !important;
//                     background: #ffffff !important;
//                     border: none !important;
//                     box-shadow: none !important;
//                     overflow: visible !important;
//                 }

//                 .receipt-paper {
//                     display: block !important;
//                     visibility: visible !important;
//                 }

//                 .receipt-table {
//                     width: 100% !important;
//                     page-break-inside: auto !important;
//                 }

//                 .receipt-table tr {
//                     page-break-inside: avoid !important;
//                     page-break-after: auto !important;
//                 }

//                 .receipt-table thead {
//                     display: table-header-group !important;
//                 }

//                 .receipt-table tfoot {
//                     display: table-footer-group !important;
//                 }

//                 .receipt-signature-area {
//                     page-break-inside: avoid !important;
//                 }

//                 .voucher-no-print {
//                     display: none !important;
//                 }
//             }
//         `;

//         printWindow.document.open();

//         printWindow.document.write(`
//             <!DOCTYPE html>
//             <html lang="en">
//                 <head>
//                     <meta charset="UTF-8" />
//                     <meta
//                         name="viewport"
//                         content="width=device-width, initial-scale=1.0"
//                     />

//                     <title>
//                         Receipt Voucher - ${getTransactionNumber()}
//                     </title>

//                     ${copiedStyles}

//                     <style>
//                         ${PRINT_STYLES}

//                         ${printWindowStyles}
//                     </style>
//                 </head>

//                 <body>
//                     <div id="voucher-print-root">
//                         ${voucherElement.outerHTML}
//                     </div>
//                 </body>
//             </html>
//         `);

//         printWindow.document.close();

//         const startPrinting = () => {
//             const images =
//                 Array.from(
//                     printWindow.document.images
//                 );

//             const imagePromises = images.map(
//                 (image) => {
//                     if (image.complete) {
//                         return Promise.resolve();
//                     }

//                     return new Promise((resolve) => {
//                         image.onload = resolve;
//                         image.onerror = resolve;
//                     });
//                 }
//             );

//             Promise.all(imagePromises)
//                 .then(() => {
//                     setTimeout(() => {
//                         try {
//                             printWindow.focus();
//                             printWindow.print();
//                         } catch (error) {
//                             console.error(
//                                 'Voucher print error:',
//                                 error
//                             );
//                         }
//                     }, 300);
//                 });
//         };

//         if (
//             printWindow.document.readyState ===
//             'complete'
//         ) {
//             startPrinting();
//         } else {
//             printWindow.addEventListener(
//                 'load',
//                 startPrinting,
//                 {
//                     once: true,
//                 }
//             );
//         }

//         printWindow.onafterprint = () => {
//             setTimeout(() => {
//                 try {
//                     printWindow.close();
//                 } catch (error) {
//                     // Ignore close errors.
//                 }
//             }, 100);
//         };
//     };

//     // =========================================================
//     // DOWNLOAD PDF
//     // =========================================================

//     const handleDownloadPDF = async () => {
//         if (!printRef.current) {
//             return;
//         }

//         let tempContainer = null;

//         try {
//             const voucherElement = printRef.current.cloneNode(true);

//             if (!voucherElement) {
//                 return;
//             }

//             voucherElement
//                 .querySelectorAll('.voucher-no-print')
//                 .forEach((element) => {
//                     element.remove();
//                 });

//             voucherElement.id = 'voucher-pdf-copy';

//             tempContainer = document.createElement('div');
//             tempContainer.id = 'voucher-pdf-temp-root';

//             Object.assign(tempContainer.style, {
//                 position: 'fixed',
//                 top: '0',
//                 left: '-10000px',
//                 width: '794px',
//                 minHeight: '1123px',
//                 background: '#ffffff',
//                 zIndex: '2147483647',
//                 opacity: '1',
//                 visibility: 'visible',
//                 pointerEvents: 'none',
//                 overflow: 'visible',
//                 direction: 'rtl',
//             });

//             const styleElement = document.createElement('style');

//             styleElement.textContent = PRINT_STYLES + `
//                 #voucher-pdf-copy {
//                     display: block !important;
//                     position: static !important;
//                     width: 794px !important;
//                     max-width: 794px !important;
//                     min-height: 0 !important;
//                     margin: 0 !important;
//                     padding: 16px 16px 20px 16px !important;
//                     background: #ffffff !important;
//                     color: #111111 !important;
//                     border: none !important;
//                     box-shadow: none !important;
//                     overflow: visible !important;
//                     visibility: visible !important;
//                     opacity: 1 !important;
//                     box-sizing: border-box !important;
//                     direction: rtl !important;
//                     font-family: Arial, Helvetica, sans-serif !important;
//                 }

//                 #voucher-pdf-copy * {
//                     visibility: visible !important;
//                     opacity: 1 !important;
//                     box-sizing: border-box !important;
//                 }

//                 #voucher-pdf-copy .bg-white,
//                 #voucher-pdf-copy.receipt-paper,
//                 #voucher-pdf-copy .receipt-paper {
//                     background-color: #ffffff !important;
//                 }

//                 #voucher-pdf-copy [class*="bg-[#f8f7f5]"] {
//                     background-color: #f8f7f5 !important;
//                 }

//                 #voucher-pdf-copy [class*="bg-[#a47d52]/10"] {
//                     background-color: rgba(164, 125, 82, 0.1) !important;
//                 }

//                 #voucher-pdf-copy .bg-slate-200 {
//                     background-color: #e2e8f0 !important;
//                 }

//                 #voucher-pdf-copy .bg-slate-300 {
//                     background-color: #cbd5e1 !important;
//                 }

//                 #voucher-pdf-copy .bg-slate-100 {
//                     background-color: #f1f5f9 !important;
//                 }

//                 #voucher-pdf-copy .bg-slate-50 {
//                     background-color: #f8fafc !important;
//                 }

//                 #voucher-pdf-copy .bg-red-600 {
//                     background-color: #dc2626 !important;
//                 }

//                 #voucher-pdf-copy .text-white {
//                     color: #ffffff !important;
//                     -webkit-text-fill-color: #ffffff !important;
//                 }

//                 #voucher-pdf-copy .text-black {
//                     color: #000000 !important;
//                 }

//                 #voucher-pdf-copy .text-slate-800 {
//                     color: #1e293b !important;
//                 }

//                 #voucher-pdf-copy .text-slate-700 {
//                     color: #334155 !important;
//                 }

//                 #voucher-pdf-copy .text-slate-600 {
//                     color: #475569 !important;
//                 }

//                 #voucher-pdf-copy .text-slate-500 {
//                     color: #64748b !important;
//                 }

//                 #voucher-pdf-copy .text-gray-300 {
//                     color: #d1d5db !important;
//                 }

//                 #voucher-pdf-copy .border-slate-200 {
//                     border-color: #e2e8f0 !important;
//                 }

//                 #voucher-pdf-copy .border-slate-300 {
//                     border-color: #cbd5e1 !important;
//                 }

//                 #voucher-pdf-copy .border-black {
//                     border-color: #000000 !important;
//                 }

//                 #voucher-pdf-copy hr {
//                     border: 0 !important;
//                     border-top: 1px solid #d1d5db !important;
//                     margin: 8px 0 !important;
//                     display: block !important;
//                     height: 1px !important;
//                 }

//                 #voucher-pdf-copy .receipt-table {
//                     width: 100% !important;
//                     border-collapse: collapse !important;
//                     table-layout: fixed !important;
//                 }

//                 #voucher-pdf-copy .receipt-table th,
//                 #voucher-pdf-copy .receipt-table td {
//                     border: 1px solid #9ca3af !important;
//                     vertical-align: middle !important;
//                     padding: 4px 4px !important;
//                 }

//                 #voucher-pdf-copy .receipt-table thead tr {
//                     background-color: #f8f7f5 !important;
//                 }

//                 #voucher-pdf-copy .receipt-signature-image {
//                     display: block !important;
//                     max-width: 125px !important;
//                     max-height: 55px !important;
//                     object-fit: contain !important;
//                     margin: 0 auto !important;
//                 }

//                 #voucher-pdf-copy .receipt-signature-text {
//                     display: block !important;
//                     font-size: 10px !important;
//                     font-weight: 700 !important;
//                 }

//                 #voucher-pdf-copy img {
//                     max-width: 100% !important;
//                 }

//                 .mx-auto {
//                     margin-left: auto !important;
//                     margin-right: auto !important;
//                 }
//             `;

//             tempContainer.appendChild(styleElement);
//             tempContainer.appendChild(voucherElement);
//             document.body.appendChild(tempContainer);

//             const images = Array.from(
//                 tempContainer.querySelectorAll('img')
//             );

//             await Promise.all(
//                 images.map((img) => {
//                     if (img.complete && img.naturalWidth > 0) {
//                         return Promise.resolve();
//                     }

//                     return new Promise((resolve) => {
//                         const finish = () => resolve();

//                         img.onload = finish;
//                         img.onerror = finish;

//                         setTimeout(finish, 3000);
//                     });
//                 })
//             );

//             await new Promise((resolve) => {
//                 requestAnimationFrame(() => {
//                     requestAnimationFrame(resolve);
//                 });
//             });

//             const canvas = await html2canvas(voucherElement, {
//                 scale: 2,
//                 useCORS: true,
//                 allowTaint: true,
//                 backgroundColor: '#ffffff',
//                 logging: false,
//                 width: 794,
//                 windowWidth: 794,
//                 scrollX: 0,
//                 scrollY: 0,
//                 onclone: (clonedDoc) => {
//                     const clonedVoucher =
//                         clonedDoc.getElementById('voucher-pdf-copy');

//                     if (!clonedVoucher) {
//                         return;
//                     }

//                     clonedVoucher.style.width = '794px';
//                     clonedVoucher.style.maxWidth = '794px';
//                     clonedVoucher.style.direction = 'rtl';
//                     clonedVoucher.style.visibility = 'visible';
//                     clonedVoucher.style.opacity = '1';

//                     const clonedWindow = clonedDoc.defaultView;

//                     if (clonedWindow) {
//                         const allElements =
//                             clonedVoucher.querySelectorAll('*');

//                         allElements.forEach((el) => {
//                             const computed =
//                                 clonedWindow.getComputedStyle(el);

//                             const colorProps = [
//                                 'color',
//                                 'backgroundColor',
//                                 'borderTopColor',
//                                 'borderRightColor',
//                                 'borderBottomColor',
//                                 'borderLeftColor',
//                                 'outlineColor',
//                                 'textDecorationColor',
//                                 'caretColor',
//                                 'columnRuleColor',
//                             ];

//                             colorProps.forEach((prop) => {
//                                 const value = computed[prop];

//                                 if (
//                                     value &&
//                                     value.includes('oklch')
//                                 ) {
//                                     let fallback = '#111111';

//                                     if (
//                                         prop === 'backgroundColor'
//                                     ) {
//                                         fallback = 'transparent';
//                                     } else if (
//                                         prop
//                                             .toLowerCase()
//                                             .includes('border') ||
//                                         prop === 'outlineColor' ||
//                                         prop === 'columnRuleColor'
//                                     ) {
//                                         fallback = '#9ca3af';
//                                     }

//                                     try {
//                                         el.style.setProperty(
//                                             prop,
//                                             fallback,
//                                             'important'
//                                         );
//                                     } catch (error) {
//                                         // Ignore individual style errors.
//                                     }
//                                 }
//                             });
//                         });
//                     }

//                     clonedVoucher.querySelectorAll('*').forEach((el) => {
//                         el.style.setProperty(
//                             'visibility',
//                             'visible',
//                             'important'
//                         );

//                         el.style.setProperty(
//                             'opacity',
//                             '1',
//                             'important'
//                         );
//                     });
//                 },
//             });

//             if (
//                 tempContainer &&
//                 tempContainer.parentNode
//             ) {
//                 tempContainer.parentNode.removeChild(
//                     tempContainer
//                 );
//             }

//             tempContainer = null;

//             const pdf = new jsPDF({
//                 orientation: 'portrait',
//                 unit: 'mm',
//                 format: 'a4',
//             });

//             const pdfWidth =
//                 pdf.internal.pageSize.getWidth();

//             const pdfHeight =
//                 pdf.internal.pageSize.getHeight();

//             const imgWidth = canvas.width;
//             const imgHeight = canvas.height;

//             const ratio = pdfWidth / imgWidth;

//             const renderedHeight = imgHeight * ratio;

//             const totalPages = Math.max(
//                 1,
//                 Math.ceil(renderedHeight / pdfHeight)
//             );

//             for (
//                 let page = 0;
//                 page < totalPages;
//                 page++
//             ) {
//                 if (page > 0) {
//                     pdf.addPage();
//                 }

//                 const sourceY =
//                     page * (pdfHeight / ratio);

//                 const sourceHeight = Math.min(
//                     pdfHeight / ratio,
//                     imgHeight - sourceY
//                 );

//                 if (sourceHeight <= 0) {
//                     continue;
//                 }

//                 const pageCanvas =
//                     document.createElement('canvas');

//                 pageCanvas.width = imgWidth;
//                 pageCanvas.height = Math.ceil(sourceHeight);

//                 const pageCtx =
//                     pageCanvas.getContext('2d');

//                 pageCtx.fillStyle = '#ffffff';
//                 pageCtx.fillRect(
//                     0,
//                     0,
//                     pageCanvas.width,
//                     pageCanvas.height
//                 );

//                 pageCtx.drawImage(
//                     canvas,
//                     0,
//                     sourceY,
//                     imgWidth,
//                     sourceHeight,
//                     0,
//                     0,
//                     imgWidth,
//                     sourceHeight
//                 );

//                 const pageImgData =
//                     pageCanvas.toDataURL('image/png');

//                 const pageImgHeight =
//                     sourceHeight * ratio;

//                 pdf.addImage(
//                     pageImgData,
//                     'PNG',
//                     0,
//                     0,
//                     pdfWidth,
//                     pageImgHeight
//                 );
//             }

//             pdf.save(
//                 `Receipt-Voucher-${getTransactionNumber()}.pdf`
//             );
//         } catch (error) {
//             console.error(
//                 'PDF download error:',
//                 error
//             );

//             alert(
//                 'An error occurred while generating the PDF. Please try again.'
//             );

//             if (
//                 tempContainer &&
//                 tempContainer.parentNode
//             ) {
//                 tempContainer.parentNode.removeChild(
//                     tempContainer
//                 );
//             }
//         }
//     };

//     // =========================================================
//     // KEYBOARD
//     // =========================================================

//     useEffect(() => {
//         const handleKeyDown = (event) => {
//             if (event.key === 'Escape') {
//                 if (onClose) {
//                     onClose();
//                 }
//             }

//             if (
//                 (event.ctrlKey || event.metaKey) &&
//                 event.key.toLowerCase() === 'p'
//             ) {
//                 event.preventDefault();

//                 handlePrint();
//             }
//         };

//         window.addEventListener(
//             'keydown',
//             handleKeyDown
//         );

//         return () => {
//             window.removeEventListener(
//                 'keydown',
//                 handleKeyDown
//             );
//         };
//     }, [onClose]);

//     // =========================================================
//     // TABLE DATA
//     // =========================================================

//     const tableRows = getTableRows();

//     const totalTableAmount =
//         tableRows.reduce(
//             (total, row) =>
//                 total +
//                 Number(
//                     getRowAmount(row) || 0
//                 ),
//             0
//         );

//     // =========================================================
//     // JSX
//     // =========================================================

//     return (
//         <div className="contents">
//             <style>
//                 {PRINT_STYLES}
//             </style>

//             {/* =====================================================
//                 OVERLAY
//             ====================================================== */}

//             <motion.div
//                 dir="rtl"
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 exit={{ opacity: 0 }}
//                 className="
//                     fixed
//                     inset-0
//                     z-[100]
//                     flex
//                     items-center
//                     justify-center
//                     bg-black/70
//                     p-2
//                     sm:p-4
//                 "
//             >
//                 {/* =================================================
//                     MODAL
//                 ================================================== */}

//                 <motion.div
//                     initial={{
//                         opacity: 0,
//                         scale: 0.97,
//                         y: 15,
//                     }}
//                     animate={{
//                         opacity: 1,
//                         scale: 1,
//                         y: 0,
//                     }}
//                     transition={{
//                         duration: 0.2,
//                     }}
//                     className="
//                         flex
//                         h-full
//                         max-h-[97vh]
//                         w-full
//                         max-w-6xl
//                         flex-col
//                         overflow-hidden
//                         rounded-xl
//                         bg-slate-200
//                         shadow-2xl
//                     "
//                 >
//                     {/* =================================================
//                         ACTION BAR
//                     ================================================== */}

//                     <div
//                         className="
//                             voucher-no-print
//                             flex
//                             shrink-0
//                             items-center
//                             justify-between
//                             border-b
//                             border-slate-300
//                             bg-white
//                             px-4
//                             py-3
//                         "
//                     >
//                         <div className="text-right">
//                             <h2
//                                 className="
//                                     text-base
//                                     font-black
//                                     text-slate-800
//                                     sm:text-lg
//                                 "
//                             >
//                                 سند قبض
//                             </h2>

//                             <p
//                                 className="
//                                     mt-0.5
//                                     text-xs
//                                     text-slate-500
//                                 "
//                             >
//                                 Receipt Voucher
//                             </p>
//                         </div>

//                         <div
//                             className="
//                                 flex
//                                 items-center
//                                 gap-2
//                             "
//                         >
//                             <button
//                                 type="button"
//                                 onClick={handleDownloadPDF}
//                                 className="
//                                     flex
//                                     cursor-pointer
//                                     items-center
//                                     gap-2
//                                     rounded-md
//                                     bg-red-600
//                                     px-4
//                                     py-2
//                                     text-sm
//                                     font-bold
//                                     text-white
//                                     transition
//                                     hover:bg-red-700
//                                 "
//                             >
//                                 <FaFilePdf />

//                                 <span>
//                                     تحميل PDF
//                                 </span>
//                             </button>

//                             <button
//                                 type="button"
//                                 onClick={handlePrint}
//                                 className="
//                                     flex
//                                     cursor-pointer
//                                     items-center
//                                     gap-2
//                                     rounded-md
//                                     bg-[#a47d52]
//                                     px-4
//                                     py-2
//                                     text-sm
//                                     font-bold
//                                     text-white
//                                     transition
//                                     hover:bg-[#8d6843]
//                                 "
//                             >
//                                 <FaPrint />

//                                 <span>
//                                     طباعة
//                                 </span>
//                             </button>

//                             <button
//                                 type="button"
//                                 onClick={() => {
//                                     if (onClose) {
//                                         onClose();
//                                     }
//                                 }}
//                                 className="
//                                     flex
//                                     h-9
//                                     w-9
//                                     cursor-pointer
//                                     items-center
//                                     justify-center
//                                     rounded-md
//                                     bg-slate-100
//                                     text-slate-600
//                                     transition
//                                     hover:bg-red-50
//                                     hover:text-red-500
//                                 "
//                             >
//                                 <FaTimes />
//                             </button>
//                         </div>
//                     </div>

//                     {/* =================================================
//                         PREVIEW AREA
//                     ================================================== */}

//                     <div
//                         className="
//                             flex-1
//                             overflow-y-auto
//                             bg-slate-300
//                             p-2
//                             sm:p-6
//                         "
//                     >
//                         {/* =================================================
//                             A4 PAPER
//                         ================================================= */}

//                         <div
//                             id="deposit-voucher-print"
//                             ref={printRef}
//                             className="
//                                 voucher-paper
//                                 receipt-paper
//                                 mx-auto
//                                 w-full
//                                 max-w-[794px]
//                                 bg-white
//                                 px-4
//                                 py-5
//                                 shadow-xl
//                                 sm:px-6
//                                 sm:py-6
//                             "
//                         >
//                             {/* =================================================
//                                 LOGO
//                             ================================================= */}

//                             <div
//                                 className="
//                                     flex
//                                     flex-col
//                                     items-center
//                                     justify-center
//                                 "
//                             >
//                                 <img
//                                     src={logo}
//                                     alt="Broker City Properties"
//                                     className="
//                                         h-[60px]
//                                         mt-3
//                                         mb-7
//                                         w-auto
//                                         object-contain
//                                         scale-[3]
//                                         transform-gpu
//                                     "
//                                 />
//                             </div>

//                             {/* =================================================
//                                 TITLE
//                             ================================================= */}

//                             <div
//                                 className="
//                                     mt-2
//                                     w-full
//                                 "
//                             >
//                                 <div
//                                     className="
//                                         flex
//                                         w-full
//                                         items-center
//                                         justify-between
//                                         text-[23px]
//                                         font-black
//                                         leading-none
//                                         sm:text-[25px]
//                                         px-50
//                                         mb-5
//                                     "
//                                 >
//                                     <span className="text-left">
//                                         سند قبض
//                                     </span>

//                                     <span className="text-left">
//                                         |
//                                     </span>

//                                     <span className="text-right">
//                                         Receipt Voucher
//                                     </span>
//                                 </div>

//                                 <div
//                                     className="
//                                         mt-2
//                                         text-center
//                                         text-[13px]
//                                         font-black
//                                     "
//                                     dir="ltr"
//                                 >
//                                     TRN : {getTRN()}
//                                 </div>
//                             </div>

//                             {/* =================================================
//                                 NUMBER / DATE / AMOUNT
//                             ================================================== */}

//                             <div
//                                 className="
//                                     mt-4
//                                     grid
//                                     grid-cols-1
//                                     gap-40
//                                     sm:grid-cols-[1fr_420px]
//                                 "
//                             >
//                                 <div
//                                     className="
//                                         flex
//                                         flex-col
//                                         items-stretch
//                                     "
//                                 >
//                                     <div
//                                         className="
//                                             border
//                                             border-slate
//                                             bg-[#f8f7f5]
//                                             px-15
//                                             py-2
//                                             text-right
//                                         "
//                                         dir="ltr"
//                                     >
//                                         <div
//                                             className="
//                                                 text-[26px]
//                                                 font-black
//                                                 leading-none
//                                                 text-right
//                                             "
//                                         >
//                                             {formatAmount()}
//                                         </div>
//                                     </div>
//                                 </div>

//                                 <div
//                                     className="
//                                         flex
//                                         flex-col
//                                         justify-center
//                                         gap-3
//                                     "
//                                 >
//                                     <div
//                                         className="
//                                             flex
//                                             w-full
//                                             items-center
//                                             justify-between
//                                             gap-2
//                                             border-b
//                                             border-slate-200
//                                             px-1
//                                             pb-1
//                                             text-[12px]
//                                             font-bold
//                                         "
//                                     >
//                                         <span
//                                             dir="ltr"
//                                             className="
//                                                 w-[28%]
//                                                 text-left
//                                                 whitespace-nowrap
//                                             "
//                                         >
//                                             :
//                                             الرقم
//                                         </span>

//                                         <span
//                                             dir="ltr"
//                                             className="
//                                                 flex-1
//                                                 text-center
//                                                 font-black
//                                                 whitespace-nowrap
//                                             "
//                                         >
//                                             {getTransactionNumber()}
//                                         </span>

//                                         <span
//                                             dir="rtl"
//                                             className="
//                                                 w-[28%]
//                                                 text-right
//                                                 font-black
//                                                 whitespace-nowrap
//                                             "
//                                         >
//                                             :
//                                             No
//                                         </span>
//                                     </div>

//                                     <div
//                                         className="
//                                             flex
//                                             w-full
//                                             items-center
//                                             justify-between
//                                             gap-2
//                                             border-b
//                                             border-slate-200
//                                             px-1
//                                             pb-1
//                                             text-[12px]
//                                             font-bold
//                                         "
//                                     >
//                                         <span
//                                             dir="ltr"
//                                             className="
//                                                 w-[28%]
//                                                 text-left
//                                                 whitespace-nowrap
//                                             "
//                                         >
//                                             :
//                                             التاريخ
//                                         </span>

//                                         <span
//                                             dir="ltr"
//                                             className="
//                                                 flex-1
//                                                 text-center
//                                                 font-black
//                                                 whitespace-nowrap
//                                             "
//                                         >
//                                             {formatDate(
//                                                 transaction.transaction_date ||
//                                                 transaction.date ||
//                                                 transaction.created_at
//                                             )}
//                                         </span>

//                                         <span
//                                             dir="rtl"
//                                             className="
//                                                 w-[28%]
//                                                 text-right
//                                                 font-black
//                                                 whitespace-nowrap
//                                             "
//                                         >
//                                             :
//                                             Date
//                                         </span>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* =================================================
//                                 RECEIVED FROM
//                             ================================================== */}

//                             <div className="mt-2 text-center">
//                                 <div
//                                     className="
//                                         flex
//                                         items-center
//                                         justify-between
//                                         gap-x-50
//                                         gap-y-1
//                                         pt-4
//                                         px-1
//                                         text-[13px]
//                                         font-bold
//                                         bg-[#f8f7f5]
//                                         py-2
//                                     "
//                                 >
//                                     <span dir="ltr">
//                                         :
//                                         استلمنا من
//                                     </span>

//                                     <span
//                                         dir="ltr"
//                                         className="font-black"
//                                     >
//                                         {getPersonName()}
//                                     </span>

//                                     <span
//                                         dir="rtl"
//                                         className="font-black"
//                                     >
//                                         :
//                                         Received From
//                                     </span>
//                                 </div>

//                                 <div
//                                     className="
//                                         mt-1
//                                         flex
//                                         items-center
//                                         justify-between
//                                         gap-x-8
//                                         text-[10px]
//                                         font-semibold
//                                     "
//                                 >
//                                     {getPersonPhone() !== '-' && (
//                                         <span dir="ltr">
//                                             Phone :

//                                             <strong className="ml-1">
//                                                 {getPersonPhone()}
//                                             </strong>
//                                         </span>
//                                     )}

//                                     {getPersonEmail() && (
//                                         <span dir="ltr">
//                                             Email :

//                                             <strong className="ml-1">
//                                                 {getPersonEmail()}
//                                             </strong>
//                                         </span>
//                                     )}
//                                 </div>
//                             </div>

//                             {/* =================================================
//                                 AMOUNT IN WORDS
//                             ================================================== */}
//                             <div
//                                 className="
//                                     mt-2
//                                     text-center
//                                     mx-auto
//                                 "
//                             >
//                                 <div
//                                     className="
//                                         flex
//                                         items-center
//                                         justify-between
//                                         gap-x-50
//                                         gap-y-1
//                                         pt-4
//                                         px-1
//                                         text-[13px]
//                                         font-bold
//                                     "
//                                 >
//                                     <span dir="ltr">
//                                         :
//                                         مبلغ وقدره
//                                     </span>

//                                     <span
//                                         dir="ltr"
//                                         className="font-black"
//                                     >
//                                         {formatAmountInWords(transaction.amount)} درهم فقط لاغير
//                                     </span>

//                                     <span
//                                         dir="rtl"
//                                         className="font-black"
//                                     >
//                                         :
//                                         The Sum of
//                                     </span>
//                                 </div>
//                             </div>

//                             {/* =================================================
//                                 BEING
//                             ================================================== */}

//                             <div className="mt-2 text-center">
//                                 <div className='flex flex-col gap-0 bg-[#f8f7f5] py-1'>
//                                     <div
//                                         className="
//                                             flex
//                                             items-center
//                                             justify-between
//                                             gap-x-50
//                                             gap-y-1
//                                             pt-4
//                                             px-1
//                                             text-[13px]
//                                             font-bold
//                                             py-2
//                                         "
//                                     >
//                                         <span dir="rtl">
//                                             وذلك عن :
//                                         </span>

//                                         <span
//                                             dir="ltr"
//                                             className="font-black"
//                                         >
//                                             {getBeingArabic()}
//                                         </span>

//                                         <span
//                                             dir="rtl"
//                                             className="font-black"
//                                         >
                                            
//                                             Being
//                                         </span>
//                                     </div>
//                                 </div>

//                                 <div
//                                     className="
//                                         mt-1
//                                         flex
//                                         flex-wrap
//                                         items-center
//                                         justify-center
//                                         gap-x-8
//                                         text-[10px]
//                                         font-semibold
//                                     "
//                                 >
//                                     {getPersonPhone() !== '-' && (
//                                         <span dir="ltr">
//                                             Phone :

//                                             <strong className="ml-1">
//                                                 {getPersonPhone()}
//                                             </strong>
//                                         </span>
//                                     )}

//                                     {getPersonEmail() && (
//                                         <span dir="ltr">
//                                             Email :

//                                             <strong className="ml-1">
//                                                 {getPersonEmail()}
//                                             </strong>
//                                         </span>
//                                     )}
//                                 </div>
//                             </div>

//                             {/* =================================================
//                                 CONTRACT / PROPERTY
//                             ================================================== */}

//                             {(
//                                 getPropertyName() ||
//                                 getContractNumber() ||
//                                 getContractStartDate() ||
//                                 getContractEndDate() ||
//                                 getRentValue()
//                             ) && (
//                                 <div
//                                     className="
//                                         mt-1
//                                         text-[10px]
//                                         font-bold
//                                     "
//                                 >
//                                     <div
//                                         className="
//                                             flex
//                                             flex-wrap
//                                             items-center
//                                             justify-between
//                                             gap-x-4
//                                             gap-y-1
//                                         "
//                                     >
//                                         <span>
//                                             {getPropertyName()}
//                                         </span>

//                                         {getContractNumber() && (
//                                             <span dir="ltr">
//                                                 Contract No:

//                                                 <strong className="ml-1">
//                                                     {getContractNumber()}
//                                                 </strong>
//                                             </span>
//                                         )}

//                                         {getContractStartDate() && (
//                                             <span dir="ltr">
//                                                 From:

//                                                 <strong className="ml-1">
//                                                     {formatDate(
//                                                         getContractStartDate()
//                                                     )}
//                                                 </strong>
//                                             </span>
//                                         )}

//                                         {getContractEndDate() && (
//                                             <span dir="ltr">
//                                                 To:

//                                                 <strong className="ml-1">
//                                                     {formatDate(
//                                                         getContractEndDate()
//                                                     )}
//                                                 </strong>
//                                             </span>
//                                         )}
//                                     </div>

//                                     {getRentValue() && (
//                                         <div
//                                             className="mt-0.5"
//                                             dir="ltr"
//                                         >
//                                             Rent Value:

//                                             <strong className="ml-1">
//                                                 {getCurrency()}{' '}
//                                                 {formatAmount(
//                                                     getRentValue()
//                                                 )}
//                                             </strong>
//                                         </div>
//                                     )}
//                                 </div>
//                             )}

//                             {/* =================================================
//                                 ARABIC CONTRACT
//                             ================================================== */}

//                             {(
//                                 getPropertyName() ||
//                                 getContractNumber()
//                             ) && (
//                                 <div
//                                     dir="rtl"
//                                     className="
//                                         mt-0.5
//                                         text-right
//                                         text-[10px]
//                                         font-bold
//                                     "
//                                 >
//                                     {getPropertyName() && (
//                                         <span>
//                                             {getPropertyName()}
//                                         </span>
//                                     )}

//                                     {getContractNumber() && (
//                                         <span className="mr-5">
//                                             رقم العقد:

//                                             <strong className="mr-1">
//                                                 {getContractNumber()}
//                                             </strong>
//                                         </span>
//                                     )}

//                                     {getRentValue() && (
//                                         <span className="mr-5">
//                                             القيمة الإيجارية:

//                                             <strong className="mr-1">
//                                                 {formatAmount(
//                                                     getRentValue()
//                                                 )}{' '}
//                                                 درهم
//                                             </strong>
//                                         </span>
//                                     )}
//                                 </div>
//                             )}

//                             {/* =================================================
//                                 MAIN TABLE
//                             ================================================== */}

//                             <hr className="text-gray-300 mt-2" />

//                             <div className="mt-5 w-full">
//                                 <table
//                                     className="
//                                         receipt-table
//                                         text-[8px]
//                                         sm:text-[9px]
//                                     "
//                                 >
//                                     <colgroup>
//                                         <col className="col-s" />
//                                         <col className="col-fees" />
//                                         <col className="col-amount" />
//                                         <col className="col-due" />
//                                         <col className="col-payment" />
//                                         <col className="col-cheque" />
//                                         <col className="col-date" />
//                                         <col className="col-bank" />
//                                     </colgroup>

//                                     <thead>
//                                         <tr className='bg-[#f8f7f5]'>
//                                             <th className="py-1.5" style={{ fontSize: '12px' }}>
//                                                 S
//                                                 <br />
//                                                 <span dir="rtl">س</span>
//                                             </th>

//                                             <th className="py-1.5" style={{ fontSize: '12px' }}>
//                                                 Fees Item
//                                                 <br />
//                                                 <span dir="rtl">بند الرسوم</span>
//                                             </th>

//                                             <th className="py-1.5" style={{ fontSize: '12px' }}>
//                                                 Amount
//                                                 <br />
//                                                 <span dir="rtl">المبلغ</span>
//                                             </th>

//                                             <th className="py-1.5" style={{ fontSize: '12px' }}>
//                                                 Due Date
//                                                 <br />
//                                                 <span dir="rtl">تاريخ الاستحقاق</span>
//                                             </th>

//                                             <th className="py-1.5" style={{ fontSize: '12px' }}>
//                                                 Payment Type
//                                                 <br />
//                                                 <span dir="rtl">طريقة الدفع</span>
//                                             </th>

//                                             <th className="py-1.5" style={{ fontSize: '12px' }}>
//                                                 Cheque
//                                                 <br />
//                                                 <span dir="rtl">رقم الشيك</span>
//                                             </th>

//                                             <th className="py-1.5" style={{ fontSize: '12px' }}>
//                                                 Date
//                                                 <br />
//                                                 <span dir="rtl">تاريخ الشيك</span>
//                                             </th>

//                                             <th className="py-1.5" style={{ fontSize: '12px' }}>
//                                                 Bank
//                                                 <br />
//                                                 <span dir="rtl">البنك</span>
//                                             </th>
//                                         </tr>
//                                     </thead>

//                                     <tbody>
//                                         {tableRows.map(
//                                             (row, index) => (
//                                                 <tr
//                                                     key={
//                                                         row.id ||
//                                                         row.pk ||
//                                                         index
//                                                     }
//                                                     className="text-center"
//                                                 >
//                                                     <td
//                                                         className="px-1 py-1.5 font-bold"
//                                                         style={{ fontSize: '15px' }}
//                                                     >
//                                                         {index + 1}
//                                                     </td>

//                                                     <td
//                                                         dir="auto"
//                                                         className="
//                                                             px-1
//                                                             py-1.5
//                                                             text-left
//                                                             font-semibold
//                                                         "
//                                                         style={{ fontSize: '13px' }}
//                                                     >
//                                                         {getRowDescription(row)}
//                                                     </td>

//                                                     <td
//                                                         className="
//                                                             px-1
//                                                             py-1.5
//                                                             font-semibold
//                                                         "
//                                                         dir="ltr"
//                                                         style={{ fontSize: '15px' }}
//                                                     >
//                                                         {formatAmount(getRowAmount(row))}
//                                                     </td>

//                                                     <td
//                                                         className="
//                                                             px-1
//                                                             py-1.5
//                                                             font-semibold
//                                                         "
//                                                         style={{ fontSize: '13px' }}
//                                                         dir="ltr"
//                                                     >
//                                                         {formatDate(getRowDueDate(row))}
//                                                     </td>

//                                                     <td
//                                                         className="
//                                                             px-1
//                                                             py-1.5
//                                                             font-semibold
//                                                         "
//                                                         style={{ fontSize: '15px' }}
//                                                     >
//                                                         {getRowPaymentType(row)}
//                                                     </td>

//                                                     <td
//                                                         className="
//                                                             px-1
//                                                             py-1.5
//                                                             font-semibold
//                                                         "
//                                                         dir="ltr"
//                                                         style={{ fontSize: '13px' }}
//                                                     >
//                                                         {getRowChequeNumber(row)}
//                                                     </td>

//                                                     <td
//                                                         className="
//                                                             px-1
//                                                             py-1.5
//                                                             font-semibold
//                                                         "
//                                                         dir="ltr"
//                                                         style={{ fontSize: '13px' }}
//                                                     >
//                                                         {getRowChequeNumber(row)
//                                                             ? formatDate(getRowChequeDate(row))
//                                                             : ''}
//                                                     </td>

//                                                     <td
//                                                         dir="auto"
//                                                         className="
//                                                             px-1
//                                                             py-1.5
//                                                             text-left
//                                                             font-semibold
//                                                         "
//                                                         style={{ fontSize: '15px' }}
//                                                     >
//                                                         {getRowBank(row)}
//                                                     </td>
//                                                 </tr>
//                                             )
//                                         )}
//                                     </tbody>

//                                     <tfoot>
//                                         <tr>
//                                             <td
//                                                 colSpan={2}
//                                                 dir="rtl"
//                                                 className="
//                                                     px-1
//                                                     py-1.5
//                                                     text-right
//                                                     font-black
//                                                 "
//                                             >
//                                                 الإجمالي | Total
//                                             </td>

//                                             <td
//                                                 className="
//                                                     px-1
//                                                     py-1.5
//                                                     text-center
//                                                     font-black
//                                                 "
//                                                 dir="ltr"
//                                                 style={{ fontSize: '13px' }}
//                                             >
//                                                 {formatAmount(totalTableAmount)}
//                                             </td>

//                                             <td
//                                                 colSpan={5}
//                                                 className="
//                                                     px-1
//                                                     py-1.5
//                                                     text-left
//                                                     font-bold
//                                                 "
//                                             >
//                                                 {getCurrency()}
//                                             </td>
//                                         </tr>
//                                     </tfoot>
//                                 </table>
//                             </div>

//                             {/* =================================================
//                                 DOCUMENT / CHECK
//                             ================================================== */}

//                             {(hasDocument || hasCheck) && (
//                                 <div
//                                     className="
//                                         mt-2
//                                         grid
//                                         grid-cols-2
//                                         gap-2
//                                         text-[9px]
//                                         font-bold
//                                     "
//                                 >
//                                     {hasDocument && (
//                                         <div dir="ltr">
//                                             Document No:

//                                             <strong className="ml-1">
//                                                 {safeValue(transaction.document_no)}
//                                             </strong>
//                                         </div>
//                                     )}

//                                     {hasCheck && (
//                                         <div dir="ltr">
//                                             Cheque No:

//                                             <strong className="ml-1">
//                                                 {safeValue(
//                                                     transaction.check_no ||
//                                                     transaction.cheque_no
//                                                 )}
//                                             </strong>
//                                         </div>
//                                     )}
//                                 </div>
//                             )}

//                             {/* =================================================
//                                 NOTES
//                             ================================================== */}

//                             {transaction.notes && (
//                                 <div
//                                     className="
//                                         mt-2
//                                         text-[9px]
//                                         font-semibold
//                                     "
//                                 >
//                                     <span
//                                         dir="ltr"
//                                         className="font-black"
//                                     >
//                                         Notes :
//                                     </span>

//                                     <span
//                                         dir="rtl"
//                                         className="ml-2"
//                                     >
//                                         {transaction.notes}
//                                     </span>
//                                 </div>
//                             )}

//                             {/* =================================================
//                                 SIGNATURES
//                             ================================================== */}

//                             <div
//                                 className="
//                                     receipt-signature-area
//                                     mt-7
//                                     grid
//                                     grid-cols-3
//                                     gap-8
//                                 "
//                             >
//                                 <div className="text-center">
//                                     <div
//                                         className="
//                                             flex
//                                             h-[55px]
//                                             items-end
//                                             justify-center
//                                         "
//                                     >
//                                         {renderSignature(
//                                             transaction.user_signature ||
//                                             transaction.prepared_signature ||
//                                             getTransactionUserName()
//                                         )}
//                                     </div>

//                                     <div className="mt-2 border-t border-black" />

//                                     <div
//                                         dir="ltr"
//                                         className="
//                                             mt-1
//                                             text-[9px]
//                                             font-black
//                                         "
//                                     >
//                                         Prepared By
//                                     </div>

//                                     <div
//                                         dir="rtl"
//                                         className="text-[9px] font-bold"
//                                     >
//                                         إعداد
//                                     </div>
//                                 </div>

//                                 <div className="text-center">
//                                     <div
//                                         className="
//                                             flex
//                                             h-[55px]
//                                             items-end
//                                             justify-center
//                                         "
//                                     >
//                                         {renderSignature(
//                                             transaction.manager_signature ||
//                                             transaction.approved_signature
//                                         )}
//                                     </div>

//                                     <div className="mt-2 border-t border-black" />

//                                     <div
//                                         dir="ltr"
//                                         className="
//                                             mt-1
//                                             text-[9px]
//                                             font-black
//                                         "
//                                     >
//                                         Approved By
//                                     </div>

//                                     <div
//                                         dir="rtl"
//                                         className="text-[9px] font-bold"
//                                     >
//                                         اعتماد
//                                     </div>
//                                 </div>

//                                 <div className="text-center">
//                                     <div
//                                         className="
//                                             flex
//                                             h-[55px]
//                                             items-end
//                                             justify-center
//                                         "
//                                     >
//                                         {renderSignature(
//                                             transaction.second_person_signature ||
//                                             transaction.received_signature
//                                         )}
//                                     </div>

//                                     <div className="mt-2 border-t border-black" />

//                                     <div
//                                         dir="ltr"
//                                         className="
//                                             mt-1
//                                             text-[9px]
//                                             font-black
//                                         "
//                                     >
//                                         Received By
//                                     </div>

//                                     <div
//                                         dir="rtl"
//                                         className="text-[9px] font-bold"
//                                     >
//                                         استلم بواسطة
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* =================================================
//                                 FOOTER
//                             ================================================== */}

//                             <div
//                                 className="
//                                     mt-6
//                                     border-t
//                                     border-black
//                                     p-1
//                                     bg-[#f8f7f5]
//                                 "
//                             >
//                                 <div
//                                     className="
//                                         flex
//                                         items-center
//                                         justify-between
//                                         gap-2
//                                         text-[8px]
//                                         font-bold
//                                     "
//                                 >
//                                     <div>1 / 1</div>
//                                     <div>|</div>
//                                     <div>{getTransactionUserName()}</div>
//                                     <div>|</div>
//                                     <div dir="ltr">
//                                         {formatDateTime(
//                                             transaction.created_at ||
//                                             transaction.transaction_date ||
//                                             transaction.date
//                                         )}
//                                     </div>
//                                     <div>|</div>
//                                     <div className="font-black">
//                                         BROKER CITY PROPERTIES
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </motion.div>
//             </motion.div>
//         </div>
//     );
// };

// export default Voucher;
