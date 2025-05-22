import React, { useRef, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Globe, Camera } from "lucide-react";
import Webcam from "react-webcam";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

// --- Validação do formulário com Zod ---
const registerSchema = z.object({
  firstName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  lastName: z.string().min(2, "Sobrenome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  country: z.string().min(1, "País é obrigatório"),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: "Você deve concordar com os termos",
  }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formError, setFormError] = useState("");
  const [isFaceRegister, setIsFaceRegister] = useState(false);
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);

  // Inicializa o react-hook-form com Zod para validação
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      country: "",
      agreeToTerms: false,
    },
  });

  // Função chamada no submit do formulário
  const handleRegister = async (values: RegisterFormValues) => {
    try {
      setFormError("");

      const dataToSend = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        country: values.country,
        agreeToTerms: values.agreeToTerms,
      };

      // Primeiro faz o cadastro do usuário normalmente
      await axios.post(
        "http://localhost:8000/register",
        dataToSend,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Agora, se cadastrou o rosto, envia para o backend
      if (faceImage) {
        const blob = await (await fetch(faceImage)).blob();
        const formData = new FormData();
        formData.append("file", blob, "face.jpg");
        formData.append("email", values.email);

        await axios.post("http://localhost:8000/register_face", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Bem-vindo ao Aegis Security.",
      });

      navigate("/welcome");
    } catch (error) {
      setFormError(
        "Erro ao fazer cadastro. Verifique seus dados e tente novamente."
      );
      toast({
        title: "Erro ao fazer cadastro",
        description: "Verifique seus dados e tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para abrir webcam e capturar rosto
  const handleOpenFaceRegister = () => {
    setIsFaceRegister(true);
    setFaceImage(null);
  };

  const handleCapture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setFaceImage(imageSrc);
      setIsFaceRegister(false);
      toast({ title: "Rosto capturado!", description: "Sua imagem será enviada com o cadastro." });
    }
  };

  const handleCancelCapture = () => {
    setIsFaceRegister(false);
  };

  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-0 w-full h-32 bg-aegis-purple/30 blur-[100px] transform -translate-y-1/2"></div>
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.8 + 0.2,
            }}
          />
        ))}
        <div className="absolute top-[15%] right-[10%] text-white/20 transform rotate-12 animate-float">
          <ShieldCheck size={24} />
        </div>
        <div
          className="absolute bottom-[20%] left-[15%] text-white/20 transform -rotate-12 animate-float"
          style={{ animationDelay: "1s" }}
        >
          <ShieldCheck size={32} />
        </div>
      </div>

      <div className="w-full max-w-md flex flex-col items-center backdrop-blur-lg bg-black/30 p-8 rounded-2xl border border-white/10 shadow-[0_0_25px_rgba(160,32,240,0.3)] z-10">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-aegis-purple rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <ShieldCheck className="h-10 w-10 text-white" />
        </div>

        <h1 className="text-2xl font-medium text-white mb-2">Cadastro Aegis</h1>
        <p className="text-white/60 text-center mb-8 text-sm">
          Registre-se para ter seus dados protegidos pela tecnologia Aegis
          Security
        </p>

        {formError && (
          <div className="w-full bg-red-500/20 border border-red-500/50 rounded-md p-3 mb-4">
            <p className="text-red-400 text-sm">{formError}</p>
          </div>
        )}

        {/* Cadastro de rosto com webcam */}
        <Button
          type="button"
          onClick={handleOpenFaceRegister}
          className="w-full mb-4 bg-transparent border border-aegis-purple/60 text-white h-12 rounded-md hover:bg-aegis-purple/10 flex items-center justify-center gap-2"
        >
          <Camera size={18} />
          Cadastrar rosto com webcam
        </Button>
        {faceImage && (
          <div className="flex flex-col items-center mb-4">
            <img src={faceImage} alt="Rosto capturado" className="w-32 h-32 rounded-lg object-cover border border-aegis-purple mb-2" />
            <span className="text-aegis-purple text-xs">Rosto capturado!</span>
          </div>
        )}

        {isFaceRegister && (
          <div className="flex flex-col items-center mb-4">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-64 h-64 rounded-lg mb-2"
              videoConstraints={{ facingMode: "user" }}
            />
            <div className="flex gap-2">
              <Button onClick={handleCapture} className="bg-aegis-purple text-white">Capturar</Button>
              <Button onClick={handleCancelCapture} variant="outline" className="border-white/20 text-white">Cancelar</Button>
            </div>
          </div>
        )}

        <Form {...registerForm}>
          <form
            onSubmit={registerForm.handleSubmit(handleRegister)}
            className="w-full space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={registerForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Nome"
                        className="bg-white/5 border-white/10 text-white h-12 rounded-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Sobrenome"
                        className="bg-white/5 border-white/10 text-white h-12 rounded-md"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={registerForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Email"
                      className="bg-white/5 border-white/10 text-white h-12 rounded-md"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="password"
                        placeholder="Senha"
                        className="bg-white/5 border-white/10 text-white h-12 rounded-md pr-10"
                        {...field}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/30">
                        <Button
                          variant="ghost"
                          type="button"
                          size="icon"
                          className="h-6 w-6"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                            <line x1="2" x2="22" y1="2" y2="22"></line>
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="País"
                        className="bg-white/5 border-white/10 text-white h-12 rounded-md"
                        {...field}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50">
                        <Globe size={16} />
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />
            <FormField
              control={registerForm.control}
              name="agreeToTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-aegis-purple data-[state=checked]:border-aegis-purple"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm text-white/70">
                      Eu concordo com os{" "}
                      <a href="#" className="text-aegis-purple underline">
                        Termos de Serviço
                      </a>{" "}
                      e{" "}
                      <a href="#" className="text-aegis-purple underline">
                        Políticas de Privacidade
                      </a>{" "}
                      da Aegis Security
                    </FormLabel>
                    <FormMessage className="text-red-400" />
                  </div>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-aegis-purple to-blue-500 text-white h-12 rounded-md mt-4 hover:opacity-90"
            >
              CADASTRAR
            </Button>
          </form>
        </Form>

        <div className="mt-8 text-center">
          <p className="text-white/60 text-sm">
            Já possui conta?{" "}
            <Button
              onClick={() => navigate("/login")}
              variant="link"
              className="text-aegis-purple p-0 h-auto text-sm font-medium ml-1"
            >
              Entre aqui
            </Button>
          </p>
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes float {
            0% { transform: translateY(0px) rotate(12deg); }
            50% { transform: translateY(-10px) rotate(12deg); }
            100% { transform: translateY(0px) rotate(12deg); }
          }
          .animate-float {
            animation: float 5s ease-in-out infinite;
          }
        `,
        }}
      />
    </div>
  );
};

export default Register;