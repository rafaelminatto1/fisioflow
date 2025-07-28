import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { ClinicalCase, CaseComment, UserRole } from '../types';
import PageShell from './ui/PageShell';
import { Button } from './ui/Button';
import FormField from './ui/FormField';
import {
  IconStar,
  IconHeart,
  IconEye,
  IconClock,
  IconUser,
  IconMessage,
  IconThumbsUp,
  IconShare,
  IconDownload,
  IconEdit,
  IconTrash,
} from './icons/IconComponents';

interface ClinicalCaseViewerPageProps {
  caseId: string;
}

const ClinicalCaseViewerPage: React.FC<ClinicalCaseViewerPageProps> = ({
  caseId,
}) => {
  const {
    clinicalCases,
    caseComments,
    caseRatings,
    caseFavorites,
    users,
    saveCaseComment,
    likeCaseComment,
    deleteCaseComment,
    recordCaseView,
    saveCaseRating,
    toggleCaseFavorite,
  } = useData();
  const { user } = useAuth();

  const [selectedTab, setSelectedTab] = useState<
    'overview' | 'examinations' | 'treatment' | 'evolution' | 'discussion'
  >('overview');
  const [newComment, setNewComment] = useState('');
  const [replyToComment, setReplyToComment] = useState<string | null>(null);
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [viewStartTime] = useState(Date.now());

  const clinicalCase = useMemo(() => {
    return clinicalCases.find((c) => c.id === caseId);
  }, [clinicalCases, caseId]);

  const caseCommentsForCase = useMemo(() => {
    return caseComments.filter((comment) => comment.caseId === caseId);
  }, [caseComments, caseId]);

  const userFavorite = useMemo(() => {
    return caseFavorites.find(
      (fav) => fav.caseId === caseId && fav.userId === user?.id
    );
  }, [caseFavorites, caseId, user?.id]);

  const userRatingData = useMemo(() => {
    return caseRatings.find(
      (rating) => rating.caseId === caseId && rating.userId === user?.id
    );
  }, [caseRatings, caseId, user?.id]);

  useEffect(() => {
    if (userRatingData) {
      setUserRating(userRatingData.rating);
      setUserReview(userRatingData.review || '');
    }
  }, [userRatingData]);

  useEffect(() => {
    // Record view when component unmounts or after 30 seconds
    let timeoutId: NodeJS.Timeout;
    const recordView = () => {
      if (user && clinicalCase) {
        const duration = Math.floor((Date.now() - viewStartTime) / 1000);
        recordCaseView(caseId, duration, duration > 30, user);
      }
    };

    timeoutId = setTimeout(recordView, 30000); // Record as completed after 30 seconds

    return () => {
      clearTimeout(timeoutId);
      recordView();
    };
  }, [caseId, user, clinicalCase, viewStartTime, recordCaseView]);

  if (!clinicalCase) {
    return (
      <PageShell title="Caso não encontrado">
        <div className="py-12 text-center">
          <h1 className="mb-4 text-2xl font-bold text-slate-50">
            Caso não encontrado
          </h1>
          <p className="text-slate-400">
            O caso clínico que você está procurando não existe ou foi removido.
          </p>
        </div>
      </PageShell>
    );
  }

  const handleAddComment = () => {
    if (!user || !newComment.trim()) return;

    const comment: Omit<CaseComment, 'id' | 'createdAt'> = {
      caseId,
      authorId: user.id,
      authorName: user.name,
      content: newComment.trim(),
      parentCommentId: replyToComment,
      updatedAt: undefined,
      likes: 0,
      likedBy: [],
      tenantId: user.tenantId!,
    };

    saveCaseComment(comment, user);
    setNewComment('');
    setReplyToComment(null);
  };

  const handleRateCase = () => {
    if (!user || userRating === 0) return;

    const rating: Omit<any, 'id' | 'createdAt'> = {
      caseId,
      userId: user.id,
      rating: userRating,
      review: userReview.trim() || undefined,
      updatedAt: userRatingData ? new Date().toISOString() : undefined,
      tenantId: user.tenantId!,
    };

    saveCaseRating(rating, user);
  };

  const handleToggleFavorite = () => {
    if (!user) return;
    toggleCaseFavorite(caseId, user);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Iniciante':
        return 'bg-green-600';
      case 'Intermediário':
        return 'bg-yellow-600';
      case 'Avançado':
        return 'bg-red-600';
      default:
        return 'bg-slate-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const organizedComments = useMemo(() => {
    const topLevelComments = caseCommentsForCase.filter(
      (comment) => !comment.parentCommentId
    );
    return topLevelComments.map((comment) => ({
      ...comment,
      replies: caseCommentsForCase.filter(
        (reply) => reply.parentCommentId === comment.id
      ),
    }));
  }, [caseCommentsForCase]);

  const canEditCase =
    user &&
    (user.id === clinicalCase.createdById || user.role === UserRole.ADMIN);

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: IconEye },
    { id: 'examinations', label: 'Exames', icon: IconUser },
    { id: 'treatment', label: 'Tratamento', icon: IconUser },
    { id: 'evolution', label: 'Evolução', icon: IconClock },
    { id: 'discussion', label: 'Discussão', icon: IconMessage },
  ];

  return (
    <PageShell title={clinicalCase.title}>
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-lg bg-slate-800 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="mb-3 flex items-center space-x-3">
                <span
                  className={`rounded px-3 py-1 text-sm font-medium text-white ${getDifficultyColor(clinicalCase.difficulty)}`}
                >
                  {clinicalCase.difficulty}
                </span>
                <span className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white">
                  {clinicalCase.specialty}
                </span>
                {userFavorite && (
                  <IconHeart className="h-5 w-5 fill-current text-red-500" />
                )}
              </div>

              <h1 className="mb-2 text-2xl font-bold text-slate-50">
                {clinicalCase.title}
              </h1>
              <p className="mb-4 text-lg text-slate-300">
                {clinicalCase.pathology}
              </p>

              <div className="mb-4 flex flex-wrap gap-2">
                {clinicalCase.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-slate-700 px-2 py-1 text-sm text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center space-x-6 text-sm text-slate-400">
                <div className="flex items-center space-x-2">
                  <IconStar className="h-4 w-4 fill-current text-yellow-500" />
                  <span>{clinicalCase.rating.toFixed(1)}</span>
                  <span>({clinicalCase.ratingCount} avaliações)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <IconEye className="h-4 w-4" />
                  <span>{clinicalCase.viewCount} visualizações</span>
                </div>
                <div className="flex items-center space-x-2">
                  <IconClock className="h-4 w-4" />
                  <span>Criado em {formatDate(clinicalCase.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant={userFavorite ? 'primary' : 'secondary'}
                onClick={handleToggleFavorite}
                className="flex items-center space-x-2"
              >
                <IconHeart className={userFavorite ? 'fill-current' : ''} />
                <span>{userFavorite ? 'Favoritado' : 'Favoritar'}</span>
              </Button>

              <Button
                variant="secondary"
                className="flex items-center space-x-2"
              >
                <IconShare />
                <span>Compartilhar</span>
              </Button>

              <Button
                variant="secondary"
                className="flex items-center space-x-2"
              >
                <IconDownload />
                <span>Exportar PDF</span>
              </Button>

              {canEditCase && (
                <Button
                  variant="secondary"
                  className="flex items-center space-x-2"
                >
                  <IconEdit />
                  <span>Editar</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="rounded-lg bg-slate-800">
          <div className="border-b border-slate-700">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id as any)}
                    className={`flex items-center space-x-2 border-b-2 py-4 text-sm font-medium transition-colors ${
                      selectedTab === tab.id
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {selectedTab === 'overview' && (
              <div className="space-y-6">
                {/* Patient Data */}
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-slate-50">
                    Dados do Paciente
                  </h3>
                  <div className="space-y-2 rounded-lg bg-slate-900 p-4">
                    <p>
                      <span className="text-slate-400">Idade:</span>{' '}
                      <span className="text-slate-300">
                        {clinicalCase.anonymizedPatientData.age} anos
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Sexo:</span>{' '}
                      <span className="text-slate-300">
                        {clinicalCase.anonymizedPatientData.gender === 'M'
                          ? 'Masculino'
                          : clinicalCase.anonymizedPatientData.gender === 'F'
                            ? 'Feminino'
                            : 'Outro'}
                      </span>
                    </p>
                    {clinicalCase.anonymizedPatientData.occupation && (
                      <p>
                        <span className="text-slate-400">Profissão:</span>{' '}
                        <span className="text-slate-300">
                          {clinicalCase.anonymizedPatientData.occupation}
                        </span>
                      </p>
                    )}
                    <p>
                      <span className="text-slate-400">
                        Histórico Relevante:
                      </span>{' '}
                      <span className="text-slate-300">
                        {clinicalCase.anonymizedPatientData.relevantHistory}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Clinical History */}
                <div>
                  <h3 className="mb-3 text-lg font-semibold text-slate-50">
                    Histórico Clínico
                  </h3>
                  <div className="rounded-lg bg-slate-900 p-4">
                    <p className="whitespace-pre-wrap text-slate-300">
                      {clinicalCase.clinicalHistory}
                    </p>
                  </div>
                </div>

                {/* Learning Objectives */}
                {clinicalCase.learningObjectives.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-slate-50">
                      Objetivos de Aprendizado
                    </h3>
                    <ul className="space-y-2 rounded-lg bg-slate-900 p-4">
                      {clinicalCase.learningObjectives.map(
                        (objective, index) => (
                          <li
                            key={index}
                            className="flex items-start space-x-2"
                          >
                            <span className="mt-1 text-blue-400">•</span>
                            <span className="text-slate-300">{objective}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'examinations' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-50">
                  Exames Realizados
                </h3>
                {clinicalCase.examinations.length === 0 ? (
                  <p className="text-slate-400">
                    Nenhum exame registrado para este caso.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {clinicalCase.examinations.map((exam, index) => (
                      <div
                        key={exam.id}
                        className="rounded-lg bg-slate-900 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="font-medium text-slate-50">
                            {exam.name}
                          </h4>
                          <div className="flex items-center space-x-3">
                            <span className="rounded bg-slate-700 px-2 py-1 text-sm text-slate-300">
                              {exam.type}
                            </span>
                            <span className="text-sm text-slate-400">
                              {formatDate(exam.date)}
                            </span>
                          </div>
                        </div>
                        <p className="whitespace-pre-wrap text-slate-300">
                          {exam.findings}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'treatment' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-50">
                  Plano de Tratamento
                </h3>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="rounded-lg bg-slate-900 p-4">
                    <h4 className="mb-2 font-medium text-slate-50">Duração</h4>
                    <p className="text-slate-300">
                      {clinicalCase.treatment.duration || 'Não especificado'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-4">
                    <h4 className="mb-2 font-medium text-slate-50">
                      Frequência
                    </h4>
                    <p className="text-slate-300">
                      {clinicalCase.treatment.frequency || 'Não especificado'}
                    </p>
                  </div>
                </div>

                {/* Objectives */}
                {clinicalCase.treatment.objectives.length > 0 && (
                  <div>
                    <h4 className="mb-3 font-medium text-slate-50">
                      Objetivos do Tratamento
                    </h4>
                    <ul className="space-y-2 rounded-lg bg-slate-900 p-4">
                      {clinicalCase.treatment.objectives.map(
                        (objective, index) => (
                          <li
                            key={index}
                            className="flex items-start space-x-2"
                          >
                            <span className="mt-1 text-blue-400">•</span>
                            <span className="text-slate-300">{objective}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {/* Interventions */}
                {clinicalCase.treatment.interventions.length > 0 && (
                  <div>
                    <h4 className="mb-3 font-medium text-slate-50">
                      Intervenções
                    </h4>
                    <div className="space-y-4">
                      {clinicalCase.treatment.interventions.map(
                        (intervention, index) => (
                          <div
                            key={intervention.id}
                            className="rounded-lg bg-slate-900 p-4"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <h5 className="font-medium text-slate-50">
                                Intervenção #{index + 1}
                              </h5>
                              <span className="rounded bg-slate-700 px-2 py-1 text-sm text-slate-300">
                                {intervention.type}
                              </span>
                            </div>
                            <p className="mb-2 text-slate-300">
                              {intervention.description}
                            </p>
                            {intervention.parameters && (
                              <p className="mb-1 text-sm text-slate-400">
                                <strong>Parâmetros:</strong>{' '}
                                {intervention.parameters}
                              </p>
                            )}
                            <p className="text-sm text-slate-400">
                              <strong>Progressão:</strong>{' '}
                              {intervention.progression}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Precautions */}
                {clinicalCase.treatment.precautions.length > 0 && (
                  <div>
                    <h4 className="mb-3 font-medium text-slate-50">
                      Precauções
                    </h4>
                    <ul className="space-y-2 rounded-lg bg-slate-900 p-4">
                      {clinicalCase.treatment.precautions.map(
                        (precaution, index) => (
                          <li
                            key={index}
                            className="flex items-start space-x-2"
                          >
                            <span className="mt-1 text-red-400">⚠</span>
                            <span className="text-slate-300">{precaution}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'evolution' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-50">
                  Evolução do Caso
                </h3>
                {clinicalCase.evolution.length === 0 ? (
                  <p className="text-slate-400">
                    Nenhuma evolução registrada para este caso.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {clinicalCase.evolution.map((evolution, index) => (
                      <div
                        key={evolution.id}
                        className="rounded-lg bg-slate-900 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="font-medium text-slate-50">
                            Sessão #{evolution.sessionNumber}
                          </h4>
                          <span className="text-sm text-slate-400">
                            {formatDate(evolution.date)}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <h5 className="mb-1 text-sm font-medium text-slate-300">
                              Achados
                            </h5>
                            <p className="text-sm text-slate-400">
                              {evolution.findings}
                            </p>
                          </div>

                          <div>
                            <h5 className="mb-1 text-sm font-medium text-slate-300">
                              Progresso
                            </h5>
                            <p className="text-sm text-slate-400">
                              {evolution.progress}
                            </p>
                          </div>

                          {evolution.modifications && (
                            <div>
                              <h5 className="mb-1 text-sm font-medium text-slate-300">
                                Modificações
                              </h5>
                              <p className="text-sm text-slate-400">
                                {evolution.modifications}
                              </p>
                            </div>
                          )}

                          {evolution.nextSteps && (
                            <div>
                              <h5 className="mb-1 text-sm font-medium text-slate-300">
                                Próximos Passos
                              </h5>
                              <p className="text-sm text-slate-400">
                                {evolution.nextSteps}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'discussion' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-50">
                  Discussão e Comentários
                </h3>

                {/* Discussion Questions */}
                {clinicalCase.discussionQuestions.length > 0 && (
                  <div>
                    <h4 className="mb-3 font-medium text-slate-50">
                      Questões para Reflexão
                    </h4>
                    <div className="space-y-3 rounded-lg bg-slate-900 p-4">
                      {clinicalCase.discussionQuestions.map(
                        (question, index) => (
                          <div
                            key={index}
                            className="flex items-start space-x-3"
                          >
                            <span className="mt-1 font-bold text-blue-400">
                              {index + 1}.
                            </span>
                            <p className="text-slate-300">{question}</p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Rating */}
                <div className="rounded-lg bg-slate-900 p-4">
                  <h4 className="mb-3 font-medium text-slate-50">
                    Avalie este caso
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-slate-300">Sua avaliação:</span>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setUserRating(star)}
                            className={`h-6 w-6 ${star <= userRating ? 'fill-current text-yellow-400' : 'text-slate-600'}`}
                          >
                            <IconStar />
                          </button>
                        ))}
                      </div>
                    </div>

                    <FormField
                      name="userReview"
                      label="Comentário (opcional)"
                      value={userReview}
                      onChange={(e) => setUserReview(e.target.value)}
                      placeholder="Deixe sua opinião sobre este caso..."
                      as="textarea"
                      rows={3}
                    />

                    <Button
                      variant="primary"
                      onClick={handleRateCase}
                      disabled={userRating === 0}
                    >
                      {userRatingData ? 'Atualizar Avaliação' : 'Avaliar'}
                    </Button>
                  </div>
                </div>

                {/* Add Comment */}
                <div className="rounded-lg bg-slate-900 p-4">
                  <h4 className="mb-3 font-medium text-slate-50">
                    {replyToComment
                      ? 'Responder Comentário'
                      : 'Adicionar Comentário'}
                  </h4>
                  <div className="space-y-3">
                    <FormField
                      name="newComment"
                      label=""
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={
                        replyToComment
                          ? 'Escreva sua resposta...'
                          : 'Compartilhe suas reflexões sobre este caso...'
                      }
                      as="textarea"
                      rows={3}
                    />
                    <div className="flex space-x-3">
                      <Button
                        variant="primary"
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                      >
                        {replyToComment ? 'Responder' : 'Comentar'}
                      </Button>
                      {replyToComment && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setReplyToComment(null);
                            setNewComment('');
                          }}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  {organizedComments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      onReply={(commentId) => setReplyToComment(commentId)}
                      onLike={(commentId) =>
                        user && likeCaseComment(commentId, user)
                      }
                      onDelete={(commentId) =>
                        user && deleteCaseComment(commentId, user)
                      }
                      currentUserId={user?.id}
                      users={users}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
};

interface CommentItemProps {
  comment: CaseComment & { replies: CaseComment[] };
  onReply: (commentId: string) => void;
  onLike: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  currentUserId?: string;
  users: any[];
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onLike,
  onDelete,
  currentUserId,
  users,
}) => {
  const author = users.find((user) => user.id === comment.authorId);
  const userLiked = comment.likedBy.includes(currentUserId || '');
  const canDelete = currentUserId === comment.authorId;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="rounded-lg bg-slate-800 p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-600">
            <span className="text-sm font-medium text-slate-200">
              {comment.authorName.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center space-x-2">
            <h4 className="text-sm font-medium text-slate-50">
              {comment.authorName}
            </h4>
            <span className="text-xs text-slate-400">
              {formatDate(comment.createdAt)}
            </span>
          </div>

          <p className="mb-3 whitespace-pre-wrap text-sm text-slate-300">
            {comment.content}
          </p>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => onLike(comment.id)}
              className={`flex items-center space-x-1 text-xs transition-colors ${
                userLiked
                  ? 'text-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <IconThumbsUp className="h-3 w-3" />
              <span>{comment.likes}</span>
            </button>

            <button
              onClick={() => onReply(comment.id)}
              className="text-xs text-slate-400 transition-colors hover:text-slate-300"
            >
              Responder
            </button>

            {canDelete && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-xs text-slate-400 transition-colors hover:text-red-400"
              >
                Excluir
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="ml-11 mt-4 space-y-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="rounded-lg bg-slate-900 p-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-600">
                    <span className="text-xs font-medium text-slate-200">
                      {reply.authorName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center space-x-2">
                    <h5 className="text-xs font-medium text-slate-50">
                      {reply.authorName}
                    </h5>
                    <span className="text-xs text-slate-400">
                      {formatDate(reply.createdAt)}
                    </span>
                  </div>

                  <p className="mb-2 whitespace-pre-wrap text-xs text-slate-300">
                    {reply.content}
                  </p>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => onLike(reply.id)}
                      className={`flex items-center space-x-1 text-xs transition-colors ${
                        reply.likedBy.includes(currentUserId || '')
                          ? 'text-blue-400'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <IconThumbsUp className="h-3 w-3" />
                      <span>{reply.likes}</span>
                    </button>

                    {currentUserId === reply.authorId && (
                      <button
                        onClick={() => onDelete(reply.id)}
                        className="text-xs text-slate-400 transition-colors hover:text-red-400"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClinicalCaseViewerPage;
