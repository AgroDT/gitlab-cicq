import type {Issue} from 'codeclimate-types';

export type GitLabCQIssue = Pick<
  Issue,
  | 'description'
  | 'check_name'
  | 'fingerprint'
  | 'severity'
> & {
  location: {
    path: string
    lines: {begin: number}
  }
};
