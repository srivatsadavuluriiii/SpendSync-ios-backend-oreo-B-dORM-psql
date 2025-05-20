export = UserPreference;
declare const UserPreference: mongoose.Model<{
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    userId: string;
    defaultCurrency: string;
    settlementAlgorithm: "greedy" | "minCashFlow" | "friendPreference";
    notifications?: {
        email: boolean;
        push: boolean;
        reminderFrequency: "never" | "low" | "medium" | "high";
        settlementCreated: boolean;
        settlementCompleted: boolean;
        paymentReceived: boolean;
        remindersBefore: number;
    } | null | undefined;
    displaySettings?: {
        theme: "system" | "light" | "dark";
        dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
        numberFormat: "thousand_comma" | "thousand_dot" | "thousand_space";
    } | null | undefined;
    privacySettings?: {
        shareSettlementHistory: boolean;
        showRealName: boolean;
    } | null | undefined;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    userId: string;
    defaultCurrency: string;
    settlementAlgorithm: "greedy" | "minCashFlow" | "friendPreference";
    notifications?: {
        email: boolean;
        push: boolean;
        reminderFrequency: "never" | "low" | "medium" | "high";
        settlementCreated: boolean;
        settlementCompleted: boolean;
        paymentReceived: boolean;
        remindersBefore: number;
    } | null | undefined;
    displaySettings?: {
        theme: "system" | "light" | "dark";
        dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
        numberFormat: "thousand_comma" | "thousand_dot" | "thousand_space";
    } | null | undefined;
    privacySettings?: {
        shareSettlementHistory: boolean;
        showRealName: boolean;
    } | null | undefined;
}, {}> & {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    userId: string;
    defaultCurrency: string;
    settlementAlgorithm: "greedy" | "minCashFlow" | "friendPreference";
    notifications?: {
        email: boolean;
        push: boolean;
        reminderFrequency: "never" | "low" | "medium" | "high";
        settlementCreated: boolean;
        settlementCompleted: boolean;
        paymentReceived: boolean;
        remindersBefore: number;
    } | null | undefined;
    displaySettings?: {
        theme: "system" | "light" | "dark";
        dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
        numberFormat: "thousand_comma" | "thousand_dot" | "thousand_space";
    } | null | undefined;
    privacySettings?: {
        shareSettlementHistory: boolean;
        showRealName: boolean;
    } | null | undefined;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    userId: string;
    defaultCurrency: string;
    settlementAlgorithm: "greedy" | "minCashFlow" | "friendPreference";
    notifications?: {
        email: boolean;
        push: boolean;
        reminderFrequency: "never" | "low" | "medium" | "high";
        settlementCreated: boolean;
        settlementCompleted: boolean;
        paymentReceived: boolean;
        remindersBefore: number;
    } | null | undefined;
    displaySettings?: {
        theme: "system" | "light" | "dark";
        dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
        numberFormat: "thousand_comma" | "thousand_dot" | "thousand_space";
    } | null | undefined;
    privacySettings?: {
        shareSettlementHistory: boolean;
        showRealName: boolean;
    } | null | undefined;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    userId: string;
    defaultCurrency: string;
    settlementAlgorithm: "greedy" | "minCashFlow" | "friendPreference";
    notifications?: {
        email: boolean;
        push: boolean;
        reminderFrequency: "never" | "low" | "medium" | "high";
        settlementCreated: boolean;
        settlementCompleted: boolean;
        paymentReceived: boolean;
        remindersBefore: number;
    } | null | undefined;
    displaySettings?: {
        theme: "system" | "light" | "dark";
        dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
        numberFormat: "thousand_comma" | "thousand_dot" | "thousand_space";
    } | null | undefined;
    privacySettings?: {
        shareSettlementHistory: boolean;
        showRealName: boolean;
    } | null | undefined;
}>, {}> & mongoose.FlatRecord<{
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    userId: string;
    defaultCurrency: string;
    settlementAlgorithm: "greedy" | "minCashFlow" | "friendPreference";
    notifications?: {
        email: boolean;
        push: boolean;
        reminderFrequency: "never" | "low" | "medium" | "high";
        settlementCreated: boolean;
        settlementCompleted: boolean;
        paymentReceived: boolean;
        remindersBefore: number;
    } | null | undefined;
    displaySettings?: {
        theme: "system" | "light" | "dark";
        dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
        numberFormat: "thousand_comma" | "thousand_dot" | "thousand_space";
    } | null | undefined;
    privacySettings?: {
        shareSettlementHistory: boolean;
        showRealName: boolean;
    } | null | undefined;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
import mongoose = require("mongoose");
