const nodemailer = require('nodemailer');

/**
 * Servicio para envío de correos electrónicos
 */
const emailService = {
    /**
     * Envía un email con el enlace de recuperación de contraseña
     */
    sendResetPasswordEmail: async (email, token, nombre) => {
        try {
            // Permite redirigir todos los correos a una dirección de prueba en desarrollo
            const recipientEmail = process.env.EMAIL_OVERRIDE || email;

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/auth/forgot-password?token=${token}`;

            // LOG CRÍTICO PARA PRUEBAS (Se muestra ANTES de enviar para respuesta inmediata)
            console.log('\n=========================================');
            console.log('NUEVA SOLICITUD DE RECUPERACIÓN');
            console.log(`Para: ${email}`);
            console.log(`Enviando realmente a: ${recipientEmail}`);
            console.log(`LINK DE RESET: ${resetUrl}`);
            console.log('=========================================\n');

            const mailOptions = {
                from: `"EusaQuiz Soporte" <${process.env.EMAIL_USER}>`,
                to: recipientEmail,
                subject: 'EUSAQuiz - Recuperar tu contraseña',
                html: `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h2 style="color: #4361ee; margin: 0; font-size: 24px;">Restablecer Contraseña</h2>
                        </div>
                        <p style="color: #1e293b; font-size: 16px; line-height: 1.5;">Hola <strong>${nombre}</strong>,</p>
                        <p style="color: #475569; font-size: 15px; line-height: 1.5;">Hemos recibido una solicitud para cambiar tu contraseña en EUSAQuiz.</p>
                        <div style="text-align: center; margin: 40px 0;">
                            <a href="${resetUrl}" style="background-color: #4361ee; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 10px; font-weight: 600; display: inline-block;">
                                Cambiar mi contraseña
                            </a>
                        </div>
                        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Si tienes problemas, copia y pega esto: ${resetUrl}</p>
                    </div>
                `
            };

            // Intentamos enviar, pero si falla no bloqueamos el flujo de desarrollo
            transporter.sendMail(mailOptions).then(info => {
                console.log('Email enviado con éxito:', info.messageId);
            }).catch(err => {
                console.error('Error al enviar email (SMTP):', err.message);
                console.log('NOTA: El proceso sigue activo porque el enlace está arriba en la consola.');
            });

            return true; // Devolvemos true para que el controlador no de error 500
        } catch (error) {
            console.error('Error enviando email:', error);
            return false;
        }
    }
};

module.exports = emailService;
