
import { Timestamp } from 'firebase/firestore';

export type IncomeCategory = 'congregation' | 'worldwide_work' | 'renovation';

export type TransactionType = 'income' | 'expense' | 'branch_transfer';

export type TransactionStatus = 'Completado' | 'Pendiente de envío' | 'Enviado';

// This is the type for client-side objects, using native Date
export type Transaction = {
    id: string;
    type: TransactionType;
    amount: number;
    date: Date;
    description: string;
    category?: IncomeCategory;
    status?: TransactionStatus;
};

// This is the type for objects coming from Firestore, using Timestamp
export type FirestoreTransaction = Omit<Transaction, 'id' | 'date'> & {
    date: Timestamp;
};

export type RequestStatus = 'Pendiente' | 'Aprobado' | 'Rechazado';

export type Request = {
    id: string;
    name: string;
    months: string[];
    isContinuous: boolean;
    requestDate: Date;
    endDate?: Date;
    status: RequestStatus;
    year: number;
    hours?: 15 | 30;
};

export type FirestoreRequest = Omit<Request, 'id' | 'requestDate' | 'endDate'> & {
    requestDate: Timestamp;
    endDate?: Timestamp;
};

export type Resolution = {
    id: string;
    description: string;
    amount: number;
    startDate: Date;
    isActive: boolean;
};

export type FirestoreResolution = Omit<Resolution, 'id' | 'startDate'> & {
    startDate: Timestamp;
};

export type PioneerTalk = {
    id: string;
    year: number;
    date: Date;
    speaker1: string;
    speaker2: string;
    openingPrayer: string;
    closingPrayer: string;
};

export type FirestorePioneerTalk = Omit<PioneerTalk, 'id' | 'date'> & {
    date: Timestamp;
};

export type SpecialTalk = {
    id: string;
    year: number;
    president: string;
    speaker: string;
    closingPrayer: string;
    auxiliarySpeaker: string;
    date: Date;
};

export type FirestoreSpecialTalk = Omit<SpecialTalk, 'id' | 'date'> & {
    date: Timestamp;
};

export type Memorial = {
    id: string;
    year: number;
    president: string;
    openingPrayer: string;
    speaker: string;
    breadPrayer: string;
    winePrayer: string;
    date: Date;
};

export type FirestoreMemorial = Omit<Memorial, 'id' | 'date'> & {
    date: Timestamp;
};
