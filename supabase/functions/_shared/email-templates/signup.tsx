/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Container, Head, Heading, Html, Img, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import { alignFor, dirFor, fontFor, logoFor, type EmailLang } from './locale.ts'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
  language?: EmailLang
}

export const SignupEmail = ({ siteName, token, language = 'ar' }: SignupEmailProps) => {
  const en = language === 'en'
  const align = alignFor(language)
  return (
    <Html lang={language} dir={dirFor(language)}>
      <Head />
      <Preview>{en ? `Your ${siteName} confirmation code` : 'رمز تأكيد حسابك في إبداعي'}</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: fontFor(language) }}>
        <Container style={{ padding: '30px 25px', textAlign: align }}>
          <Img src={logoFor(language)} alt="ebdaey" width="120" height="40" style={{ margin: '0 0 24px 0' }} />
          <Heading style={h1}>{en ? 'Confirm your email' : 'تأكيد البريد الإلكتروني'}</Heading>
          <Text style={text}>
            {en ? <>Thanks for signing up on <strong>{siteName}</strong>!</> : <>شكراً لتسجيلك في <strong>{siteName}</strong>!</>}
          </Text>
          <Text style={text}>
            {en ? 'Enter the following confirmation code on the signup page to finish creating your account:' : 'أدخل رمز التأكيد التالي في صفحة التسجيل لإكمال إنشاء حسابك:'}
          </Text>
          <div style={codeBox}>{token}</div>
          <Text style={text}>
            {en ? 'The code is valid for a limited time. If you did not sign up, you can safely ignore this email.' : 'الرمز صالح لمدة محدودة. إذا لم تطلب إنشاء حساب، يمكنك تجاهل هذا البريد بأمان.'}
          </Text>
          <Text style={footer}>
            {en ? 'If you did not create an account, you can safely ignore this email.' : 'إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذا البريد بأمان.'}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default SignupEmail

const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e2229', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#6e7787', lineHeight: '1.7', margin: '0 0 20px' }
const codeBox = {
  backgroundColor: '#f0fdf4', border: '2px solid #16a34a', borderRadius: '10px',
  color: '#16a34a', fontSize: '32px', fontWeight: 'bold' as const, letterSpacing: '8px',
  padding: '18px 22px', textAlign: 'center' as const, margin: '8px 0 24px', direction: 'ltr' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
