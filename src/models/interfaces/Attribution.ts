type SourceData = {
    sourcePageTitle?: string;
    sourcePageUrl?: string;
}
type AuthorData = {
    authorName?: string;
    authorUrl?: string;
}
type LicenseData = {
    licenseShortName: string;
    licenseLongName: string;
    licenseUrl?: string;
}

export type Attribution = AuthorData & LicenseData & SourceData & { attributionMarkdown: string }
