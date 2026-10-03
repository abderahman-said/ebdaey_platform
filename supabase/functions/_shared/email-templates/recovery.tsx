/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import { alignFor, dirFor, fontFor, logoFor, type EmailLang } from './locale.ts'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  language?: EmailLang
}

export const RecoveryEmail = ({ siteName, confirmationUrl, language = 'ar' }: RecoveryEmailProps) => {
  const en = language === 'en'
  return (
    <Html lang={language} dir={dirFor(language)}>
      <Head />
      <Preview>{en ? `Reset your ${siteName} password` : `إعادة تعيين كلمة المرور في ${siteName}`}</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: fontFor(language) }}>
        <Container style={{ padding: '30px 25px', textAlign: alignFor(language) }}>
          <Img src={logoFor(language)} alt="ebdaey" width="120" height="40" style={{ margin: '0 0 24px 0' }} />
          <Heading style={h1}>{en ? 'Reset your password' : 'إعادة تعيين كلمة المرور'}</Heading>
          <Text style={text}>
            {en
              ? `We received a request to reset your password on ${siteName}. Click the button below to choose a new password.`
              : `تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك في ${siteName}. انقر على الزر أدناه لاختيار كلمة مرور جديدة.`}
          </Text>
          <Button style={button} href={confirmationUrl}>
            {en ? 'Reset password' : 'إعادة تعيين كلمة المرور'}
          </Button>
          <Text style={footer}>
            {en
              ? 'If you did not request a password reset, you can safely ignore this email. Your password will not change.'
              : 'إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد. لن يتم تغيير كلمة مرورك.'}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default RecoveryEmail

const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1e2229', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#6e7787', lineHeight: '1.7', margin: '0 0 20px' }
const button = { backgroundColor: '#1e2229', color: '#ffffff', fontSize: '15px', borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', fontWeight: 'bold' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
