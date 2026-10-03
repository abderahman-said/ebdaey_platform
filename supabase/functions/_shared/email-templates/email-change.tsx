/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import { alignFor, dirFor, fontFor, logoFor, type EmailLang } from './locale.ts'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
  language?: EmailLang
}

export const EmailChangeEmail = ({ email, newEmail, confirmationUrl, language = 'ar' }: EmailChangeEmailProps) => {
  const en = language === 'en'
  return (
    <Html lang={language} dir={dirFor(language)}>
      <Head />
      <Preview>{en ? 'Confirm your email change' : 'تأكيد تغيير البريد الإلكتروني'}</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: fontFor(language) }}>
        <Container style={{ padding: '30px 25px', textAlign: alignFor(language) }}>
          <Img src={logoFor(language)} alt="ebdaey" width="120" height="40" style={{ margin: '0 0 24px 0' }} />
          <Heading style={h1}>{en ? 'Confirm your email change' : 'تأكيد تغيير البريد الإلكتروني'}</Heading>
          <Text style={text}>
            {en ? <>You requested to change your email from{' '}<Link href={`mailto:${email}`} style={link}>{email}</Link>{' '}to{' '}<Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.</>
                : <>لقد طلبت تغيير بريدك الإلكتروني من{' '}<Link href={`mailto:${email}`} style={link}>{email}</Link>{' '}إلى{' '}<Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.</>}
          </Text>
          <Text style={text}>{en ? 'Click the button below to confirm this change:' : 'انقر على الزر أدناه لتأكيد هذا التغيير:'}</Text>
          <Button style={button} href={confirmationUrl}>{en ? 'Confirm email change' : 'تأكيد تغيير البريد'}</Button>
          <Text style={footer}>{en ? 'If you did not request this change, please secure your account immediately.' : 'إذا لم تطلب هذا التغيير، يرجى تأمين حسابك فوراً.'}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default EmailChangeEmail

const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e2229', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#6e7787', lineHeight: '1.7', margin: '0 0 20px' }
const link = { color: 'inherit', textDecoration: 'underline' }
const button = { backgroundColor: '#1e2229', color: '#ffffff', fontSize: '15px', borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', fontWeight: 'bold' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
